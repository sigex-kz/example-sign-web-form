((exports, WebSocket, window) => {
  /**
   * Класс клиента NCALayer.
   */
  class NCALayerClient {
    /**
     * Конструктор.
     *
     * @param {String} [url = 'wss://127.0.0.1:13579'] опциональный URL для подключения к NCALayer.
     */
    constructor(url = 'wss://127.0.0.1:13579') {
      this.url = url;
      this.wsConnection = null;
      this.responseProcessed = false;

      // Используются для упрощения тестирования
      this.onRequestReady = null;
      this.onResponseReady = null;
    }

    /**
     * Подключиться к NCALayer.
     *
     * @returns {String} версию NCALayer.
     *
     * @throws Error
     */
    async connect() {
      if (this.wsConnection) {
        throw new Error('Подключение уже выполнено.');
      }

      this.wsConnection = new WebSocket(this.url);

      return new Promise((resolve, reject) => {
        this.responseProcessed = false;
        this.setHandlers(resolve, reject);

        this.wsConnection.onmessage = (msg) => {
          if (this.responseProcessed) {
            return;
          }
          this.responseProcessed = true;

          if (this.onResponseReady) {
            this.onResponseReady(msg.data);
          }

          const response = JSON.parse(msg.data);

          if (response.result && response.result.version) {
            resolve(response.result.version);
            return;
          }

          reject(new Error('Ошибка взаимодействия с NCALayer.'));
        };
      });
    }

    /**
     * Получить список активных типов устройств.
     *
     * @returns {String[]} массив содержащий типы хранилищ экземпляры которых доступны в данный
     * момент.
     *
     * @throws Error
     */
    async getActiveTokens() {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'getActiveTokens',
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Получить информацию об одной записи (ключевой паре с сертификатом).
     *
     * @param {String} storageType тип хранилища на экземплярах которого следует искать записи.
     *
     * @returns {Object} объект с информацией о записи.
     *
     * @throws Error
     */
    async getKeyInfo(storageType) {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'getKeyInfo',
        args: [
          storageType,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Вычислить подпись под данными и сформировать CMS (CAdES).
     *
     * @param {String} storageType тип хранилища который следует использовать для подписания.
     *
     * @param {String | ArrayBuffer} data данные которые нужно подписать в виде строки Base64 либо
     * ArrayBuffer.
     *
     * @param {String} [keyType = 'SIGNATURE'] каким типом ключа следует подписывать, поддерживаемые
     * варианты 'SIGNATURE' и 'AUTHENTICATION', иное значение позволит пользователю выбрать
     * любой доступный в хранилище ключа.
     *
     * @param {Boolean} [attach = false] следует ли включить в подпись подписываемые данные.
     *
     * @returns {String} CMS подпись в виде Base64 строки.
     *
     * @throws Error
     */
    async createCAdESFromBase64(storageType, data, keyType = 'SIGNATURE', attach = false) {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'createCAdESFromBase64',
        args: [
          storageType,
          keyType,
          (typeof data === 'string') ? data : NCALayerClient.arrayBufferToB64(data),
          attach,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Вычислить подпись под хешем данных и сформировать CMS (CAdES).
     *
     * @param {String} storageType тип хранилища который следует использовать для подписания.
     *
     * @param {String} hash хеш данных в виде строки Base64 либо ArrayBuffer.
     *
     * @param {String} [keyType = 'SIGNATURE'] каким типом ключа следует подписывать, поддерживаемые
     * варианты 'SIGNATURE' и 'AUTHENTICATION', иное значение позволит пользователю выбрать
     * любой доступный в хранилище ключа.
     *
     * @returns {String} CMS подпись в виде Base64 строки.
     *
     * @throws Error
     */
    async createCAdESFromBase64Hash(storageType, hash, keyType = 'SIGNATURE') {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'createCAdESFromBase64Hash',
        args: [
          storageType,
          keyType,
          (typeof hash === 'string') ? hash : NCALayerClient.arrayBufferToB64(hash),
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Подписать блок данных и сформировать CMS (CAdES) подпись с интегрированной меткой времени
     * TSP.
     *
     * @param {String} storageType тип хранилища который следует использовать для подписания.
     *
     * @param {String | ArrayBuffer} data данные которые нужно подписать в виде строки Base64 либо
     * ArrayBuffer.
     *
     * @param {String} [keyType = 'SIGNATURE'] каким типом ключа следует подписывать, поддерживаемые
     * варианты 'SIGNATURE' и 'AUTHENTICATION', иное значение позволит пользователю выбрать
     * любой доступный в хранилище ключа.
     *
     * @param {Boolean} [attach = false] следует ли включить в подпись подписываемые данные.
     *
     * @returns {String} CMS подпись в виде Base64 строки.
     *
     * @throws Error
     */
    async createCMSSignatureFromBase64(storageType, data, keyType = 'SIGNATURE', attach = false) {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'createCMSSignatureFromBase64',
        args: [
          storageType,
          keyType,
          (typeof data === 'string') ? data : NCALayerClient.arrayBufferToB64(data),
          attach,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Вычислить подпись под документом в формате XML.
     *
     * @param {String} storageType тип хранилища который следует использовать для подписания.
     *
     * @param {String} xml XML данные которые нужно подписать.
     *
     * @param {String} [keyType = 'SIGNATURE'] каким типом ключа следует подписывать, поддерживаемые
     * варианты 'SIGNATURE' и 'AUTHENTICATION', иное значение позволит пользователю выбрать
     * любой доступный в хранилище ключа.
     *
     * @param {Boolean} [tbsElementXPath = ''] путь к подписываемому узлу XML.
     *
     * @param {Boolean} [signatureParentElementXPath = ''] путь к узлу в который необходимо добавить
     * сформированную подпись.
     *
     * @returns {String} XML документ содержащий XMLDSIG подпись.
     *
     * @throws Error
     */
    async signXml(storageType, xml, keyType = 'SIGNATURE', tbsElementXPath = '', signatureParentElementXPath = '') {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'signXml',
        args: [
          storageType,
          keyType,
          xml,
          tbsElementXPath,
          signatureParentElementXPath,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Вычислить подпись под каждым из массива документов в формате XML.
     *
     * @param {String} storageType тип хранилища который следует использовать для подписания.
     *
     * @param {String[]} xmls массив XML данных которые нужно подписать.
     *
     * @param {String} [keyType = 'SIGNATURE'] каким типом ключа следует подписывать, поддерживаемые
     * варианты 'SIGNATURE' и 'AUTHENTICATION', иное значение позволит пользователю выбрать
     * любой доступный в хранилище ключа.
     *
     * @param {Boolean} [tbsElementXPath = ''] путь к подписываемому узлу XML.
     *
     * @param {Boolean} [signatureParentElementXPath = ''] путь к узлу в который необходимо добавить
     * сформированную подпись.
     *
     * @returns {String[]} массив XML документов содержащих XMLDSIG подписи.
     *
     * @throws Error
     */
    async signXmls(storageType, xmls, keyType = 'SIGNATURE', tbsElementXPath = '', signatureParentElementXPath = '') {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'signXmls',
        args: [
          storageType,
          keyType,
          xmls,
          tbsElementXPath,
          signatureParentElementXPath,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Изменить язык интерфейса NCALayer.
     *
     * @param {String} localeId новый идентификатор языка.
     *
     * @throws Error
     */
    async changeLocale(localeId) {
      const request = {
        module: 'kz.gov.pki.knca.commonUtils',
        method: 'changeLocale',
        args: [
          localeId,
        ],
      };

      this.sendRequest(request);

      return new Promise((resolve, reject) => { this.setHandlers(resolve, reject); });
    }

    /**
     * Константа определяющая имя файлового хранилища.
     */
    static get fileStorageType() {
      return 'PKCS12';
    }

    sendRequest(request) {
      if (!this.wsConnection) {
        throw new Error('Подключение к NCALayer не установлено.');
      }

      const jsonRequest = JSON.stringify(request);
      if (this.onRequestReady) {
        this.onRequestReady(jsonRequest);
      }

      this.wsConnection.send(jsonRequest);
    }

    setHandlers(resolve, reject) {
      this.responseProcessed = false;

      this.wsConnection.onerror = () => {
        if (this.responseProcessed) {
          return;
        }
        this.responseProcessed = true;

        reject(new Error('Ошибка взаимодействия с NCALayer. В том случае, если на вашем компьютере не установлен NCALayer, пожалуйста установите его c портала НУЦ РК (https://pki.gov.kz/ncalayer/). Если же NCALayer установлен, но портал выдает ошибку, свяжитесь, пожалуйста, с нашей технической поддержкой.'));
      };

      this.wsConnection.onclose = () => {
        if (this.responseProcessed) {
          return;
        }
        this.responseProcessed = true;

        reject(new Error('NCALayer закрыл соединение.'));
      };

      this.wsConnection.onmessage = (msg) => {
        if (this.responseProcessed) {
          return;
        }
        this.responseProcessed = true;

        if (this.onResponseReady) {
          this.onResponseReady(msg.data);
        }

        const response = JSON.parse(msg.data);

        if (response.code !== '200') {
          reject(new Error(`${response.code}: ${response.message}`));
          return;
        }

        resolve(response.responseObject);
      };
    }

    static arrayBufferToB64(arrayBuffer) {
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
  }

  exports.NCALayerClient = NCALayerClient; // eslint-disable-line no-param-reassign
})(typeof exports === 'undefined' ? this : exports,
  typeof WebSocket === 'undefined' ? require('ws') : WebSocket,
  typeof window === 'undefined' ? { btoa(x) { return x; } } : window); // Заглушка для NodeJS
