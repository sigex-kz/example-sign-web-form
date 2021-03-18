new Vue({
  el: '#app-vue-index',

  data: {
    error: null,
    connecting: true,
    ncaLayerNotAwailable: false,

    ncaLayer: new NCALayerClient(),

    dataB64: null,
    title: 'example-sign-web-form.pdf',
    description: 'Пример подписания веб форм',
    sigexId: null,
    sigexURL: 'https://sigex.kz',

    formHeader: 'Документ №1',
    formIntro: 'Этот документ сформирован в браузере из данных веб формы, является примером, он никого ни к чему не обязывает и ничего не гарантирует, несмотря на то, что он может быть подписан ЭЦП.',
    formItems: [
      { label: 'Первый вопрос', value: '', },
      { label: 'Второй вопрос', value: '', },
      { label: 'Третий вопрос', value: '', },
    ],

    watermarkText: 'ПРИМЕР, НЕ ЯВЛЯЕТСЯ ПОДЛИННИКОМ ЭЛЕКТРОННОГО ДОКУМЕНТА',

    email: null,
    predefinedEmails: [], // Сюда можно добавить сервисные адреса электронной почты
    storageType: null,
    awaitingSignature: false,
    signed: false,
  },

  computed: {
    sigexDocumentURL() {
      return `${this.sigexURL}/show/?id=${this.sigexId}`;
    },
  },

  methods: {
    async compilePDF() {
      const pdfDefinition = {
        watermark: { text: this.watermarkText, color: 'red', opacity: 0.1, bold: false, italics: false, angle: 45 },
        content: [
          { text: this.formHeader, fontSize: 20, bold: true, alignment: 'center', margin: [ 0, 0, 0, 20 ] },
          { text: this.formIntro, fontSize: 15, margin: [ 0, 0, 0, 20 ] },
        ],
        pageMargins: [ 40, 60, 40, 60 ],
      };

      for (const formItem of this.formItems) {
        pdfDefinition.content.push(`${formItem.label}: ${formItem.value}`);
      }

      this.dataB64 = await new Promise((resolve) => {
        const pdfDocGenerator = pdfMake.createPdf(pdfDefinition);
        pdfDocGenerator.getBase64(resolve);
      });
    },

    async selectStorageAndContinue() {
      this.awaitingSignature = true;

      try {
        const storageTypes = await this.ncaLayer.getActiveTokens();

        if (storageTypes.length > 1) {
          this.error = {
            message: 'Обнаружено несколько разных типов защищенных хранилищ подключенных к компьютеру',
            description: 'В данный момент поддерживается работа только с одним подключенным устройством. Пожалуйста отключите все лишние устройства и попробуйте еще раз.',
          };
          return;
        }

        if (storageTypes.length == 0) {
          this.storageType = 'PKCS12';
        } else {
          this.storageType = storageTypes[0];
        }
      } catch (err) {
        this.error = {
          message: 'NCALayer вернул неожиданную ошибку',
          description: err,
        };
        return;
      }

      this.signAndSend();
    },

    async signAndSend() {
      let signature;
      try {
        signature = await this.ncaLayer.createCMSSignatureFromBase64(this.storageType, this.dataB64);
      } catch (err) {
        this.error = {
          message: 'NCALayer вернул неожиданную ошибку',
          description: err,
        };
        return;
      }

      try {
        const emailNotifications = {
          to: this.predefinedEmails,
        }
        if (!!this.email) {
          emailNotifications.to.push(this.email);
        }

        let response = await axios.post(
          `${this.sigexURL}/api`,
          {
            title: this.title,
            description: this.description,
            signature,
            emailNotifications,
          },
        );

        if (response.data.message) {
          this.error = {
            message: 'Сервер не принял подпись',
            description: response.data.message,
          };
          return;
        }

        this.sigexId = response.data.documentId;

        const dataToSend = Uint8Array.from(atob(this.dataB64), c => c.charCodeAt(0)).buffer;
        response = await axios.post(
          `${this.sigexURL}/api/${this.sigexId}/data`,
          dataToSend,
          {
            headers: { 'Content-Type': 'application/octet-stream' },
          },
        );

        if (response.data.message) {
          this.error = {
            message: 'Сервер не принял подпись (проблема с проверкой подписанных данных)',
            description: response.data.message,
          };
          return;
        }

        this.awaitingSignature = false;
        this.signed = true;

        const titleParts = this.title.split('.');
        if (titleParts.length === 1) {
          this.title = `${title}-SigexId${this.sigexId}`;
        } else {
          const extension = titleParts.pop();
          this.title = `${titleParts.join('.')}-SigexId${this.sigexId}.${extension}`;
        }

      } catch (err) {
        this.error = {
          message: 'Сервер вернул неожиданную ошибку',
          description: err,
        };
      }
    },

    reloadPage() {
      window.location.reload();
    },
  },

  async mounted () {
    try {
      await this.ncaLayer.connect();
      this.connecting = false;
    } catch (err) {
      this.ncaLayerNotAwailable = true;
    }
  },
});
