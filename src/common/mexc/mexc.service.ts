import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as path from 'path';
import 'dotenv/config';

import { APIBase } from './base';

@Injectable()
export class MexcService {
  private readonly API_KEY: string;
  private readonly SECRET_KEY: string;
  private readonly BASE_URL: string;

  constructor() {
    this.BASE_URL = process.env.BITMART_MEXC_BASE_URL || 'https://api.mexc.com';
    this.API_KEY = process.env.X_MEXC_APIKEY;
    this.SECRET_KEY = process.env.X_MEXC_SECRET;
    if (!this.API_KEY || !this.SECRET_KEY) {
      throw new Error('Missing API credentials in .env file');
    }
  }

  mexcLogger(spot, message) {
    return console.log('MEXC-ERROR at', spot, '<<=>>', message);
  }
  // Encode with uppercase percent codes
  urlEncode(value) {
    return encodeURIComponent(value).replace(/%[a-f0-9]{2}/gi, (m) =>
      m.toUpperCase(),
    );
  }

  // Build a sorted & encoded query string
  buildQuery(params = {}) {
    const keys = Object.keys(params).sort();
    return keys.map((key) => `${key}=${this.urlEncode(params[key])}`).join('&');
  }

  // Sign using HMAC SHA256 (lowercase hex)
  sign(secret) {
    const timestamp = new Date().getTime().toString();

    const timeParams = `timestamp=${timestamp}`;

    const sign = crypto
      .createHmac('sha256', secret)
      .update(timeParams)
      .digest('hex')
      .toLowerCase();
    return { sign, timestamp };
  }

  // Generic signed request method
  async signedRequest(method, path, bodyParams?: any, user?: any) {
    const secret = user && user.secretKey ? user.secretKey : this.SECRET_KEY;
    const key = user && user.apiKey ? user.apiKey : this.API_KEY;
    const { sign, timestamp } = this.sign(secret);

    console.log('KEY: ', key);
    console.log('secret_KEY: ', secret);
    let url;
    if (method !== 'POST') {
      const params = new URLSearchParams(bodyParams).toString();

      url = `${this.BASE_URL}${path}?${params}&timestamp=${timestamp}&signature=${sign}`;

      bodyParams = '';
    } else {
      url = `${this.BASE_URL}${path}?timestamp=${timestamp}&signature=${sign}`;
    }

    const headers = {
      'x-mexc-apikey': key,
      'Content-Type': 'application/json',
    };

    try {
      const { data } = await axios({
        method,
        url,
        headers,
        data: bodyParams,
      });
      return data;
    } catch (err) {
      console.error('ERROR:: ', err.config);
      console.error('ERROR:: ', err.message);
      console.error('Error:', err.response?.data || err.message);
      // throw err;
    }
  }

  // ========== Example Usage for /api/v3/order ==========
  // async createOrder(symbol, side, type, quantity, price) {
  //   const body = {
  //     symbol,
  //     side, // BUY or SELL
  //     type, // LIMIT or MARKET
  //     quantity,
  //     price,
  //   };
  //   return this.signedRequest("POST", "/api/v3/order", {}, body);
  // }

  async createSubAccount(subAccount, note) {
    const body = {
      subAccount,
      note,
    };

    const options = {
      apiKey: this.API_KEY,
      apiSecret: this.SECRET_KEY,
      baseURL: this.BASE_URL,
    };

    const client = new APIBase(options);

    // const response = await client.signRequest(
    //   'POST',
    //   '/api/v3/broker/sub-account/virtualSubAccount',
    //   body,
    // );
    // console.log('response.data', response.data);

    // console.log('FOUND RECHARGE:: ', response, 'BODY', body);
    // return;

    const response = await this.signedRequest(
      'POST',
      '/api/v3/broker/sub-account/virtualSubAccount',
      body,
      {},
    );
    console.log('response.data', response);
    return response;
  }

  async createSubAccountDepositAddress(user, coin, network) {
    try {
      const body = {
        coin,
        network,
      };

      const options = {
        apiKey: user.apiKey,
        apiSecret: user.apiSecret,
        baseURL: this.BASE_URL,
      };

      const client = new APIBase(options);

      const response = await client.signRequest(
        'POST',
        '/api/v3/broker/capital/deposit/subAddress',
        body,
      );

      if (response.data != undefined) {
        const result = { ...response.data };

        // MEXC sometimes returns address like "0xABCDEF12345:987654"
        if (
          typeof result.address === 'string' &&
          result.address.includes(':')
        ) {
          const [addr, memo] = result.address.split(':');

          result.address = addr;
          result.memo = memo;
        }
        return result;
      }
    } catch (e) {
      const { data } = e.response;

      let err;
      if (data.msg != undefined) {
        err = data.msg;
      } else {
        err = e.message;
      }
      this.mexcLogger('createSubAccountDepositAddress', err);
    }
  }

  async getSubAccountDepositAddress(user, coin, network) {
    const body = {
      coin,
      network,
    };

    const options = {
      apiKey: user.apiKey,
      apiSecret: user.apiSecret,
      baseURL: this.BASE_URL,
    };
    const client = new APIBase(options);

    const response = await client.signRequest(
      'GET',
      '/api/v3/broker/capital/deposit/subAddress',
      body,
    );

    if (response.data != undefined) {
      const res = response.data.find(
        (x) => x.coin == coin && x.chainName == network,
      );
      const result = { ...res };

      // MEXC sometimes returns address like "0xABCDEF12345:987654"
      if (typeof result.address === 'string' && result.address.includes(':')) {
        const [addr, memo] = result.address.split(':');

        result.address = addr;
        result.memo = memo;
      }
      return result;
    }
  }

  async getSubAccountApiKey(subAccount, note) {
    const body = {
      subAccount,
      note,
    };

    const requestBody = new URLSearchParams(body).toString();

    return await this.signedRequest(
      'POST',
      '/api/v3/capital/deposit/address',
      body,
    );
  }

  async createSubAccountApiKey(subAccount, note) {
    try {
      const body = {
        subAccount,
        note,
        permissions:
          'SPOT_ACCOUNT_READ,SPOT_ACCOUNT_WRITE,SPOT_DEPOSIT_READ,SPOT_DEPOSIT_WRITE',
      };

      const response = await this.signedRequest(
        'POST',
        '/api/v3/broker/sub-account/apiKey',
        body,
      );

      // const options = {
      //   apiKey: this.API_KEY,
      //   apiSecret: this.SECRET_KEY,
      //   baseURL: this.BASE_URL,
      // };

      // console.log('FOUND RECHARGE:: ', options);
      // const client = new APIBase(options);

      // const response = await client.signRequest(
      //   'POST',
      //   '/api/v3/broker/sub-account/apiKey',
      //   body,
      // );
      // return response.data;

      console.log('FOUND RECHARGE:: ', response, 'BODY', body);
      // return;
      return response;
    } catch (e) {
      console.log('ERROR: ', e);
    }
  }

  async getSubAccountDeposits() {
    try {
      const now = new Date();

      const data =
        now.getTime() - Number(process.env.RECHARGE_SECONDS_TIME) * 60 * 1000;
      const body = {
        // startTime: startTime ? startTime : data,
        startTime: data,
      };

      const options = {
        apiKey: this.API_KEY,
        apiSecret: this.SECRET_KEY,
        baseURL: this.BASE_URL,
      };

      const client = new APIBase(options);

      const response = await client.signRequest(
        'GET',
        '/api/v3/broker/capital/deposit/subHisrec/getall',
        body,
      );
      console.log('FOUND RECHARGE:: ', response.data);

      let res;
      if (!response.data.length) {
        res = [
          {
            amount: '0.003567050000000000000000000000',
            coin: 'BTC',
            network: 'Bitcoin(BTC)',
            status: 5,
            address: '37ToUtuRcE75okBb81Fjg4bjwrqjwscwZe',
            txId: '508a4f421860eb4ab22086d176ed09f0cfd5c595d033e1bd9a40fbed03cfd8f0:0',
            unlockConfirm: '3',
            confirmTimes: '3',
            insertTime: 1765787914000,
            netWork: 'BTC',
          },
        ];
      } else {
        res = response.data;
      }
      return res;
    } catch (e) {
      const { data } = e.response;

      let err;
      if (data.msg != undefined) {
        err = data.msg;
      } else {
        err = e.message;
      }
      this.mexcLogger('getSubAccountDeposits', err);
    }
  }

  async getAssetBalance(asset) {
    try {
      const response = await this.signedRequest('GET', '/api/v3/account', '');
      const bal = response.balances.find((x) => x.asset == asset);

      return bal.available;
    } catch (e) {
      console.log('ERR==mexc_getAssetBalance== ', e.message);
    }
  }

  async listAllSubAccounts() {
    const response = await this.signedRequest(
      'GET',
      '/api/v3/sub-account/list',
      '',
    );

    console.log('response:', response);
    return;
  }

  async transFerAsset(transferData) {
    try {
      const { from, to, client_trx_id, amount, asset, sub_to_sub } =
        transferData;

      const body = {
        fromAccountType: 'SPOT',
        toAccountType: 'SPOT',
        asset,
        clientTranId: client_trx_id,
        amount,
        fromAccount: from ? from : undefined,
        toAccount: to ? to : undefined,
      };

      const options = {
        apiKey: this.API_KEY,
        apiSecret: this.SECRET_KEY,

        baseURL: this.BASE_URL,
      };

      const client = new APIBase(options);

      // const response = await client.signRequest(
      const res = await client.signRequest(
        'POST',
        '/api/v3/broker/sub-account/universalTransfer',
        body,
      );

      return res;
    } catch (e) {
      console.log('ERROR===mexc_transferAsset===', e.response);
    }
  }

  async getTransfers(clientTranId) {
    try {
      const body = {
        fromAccountType: 'SPOT',
        toAccountType: 'SPOT',
        clientTranId,
      };

      const options = {
        apiKey: this.API_KEY,
        apiSecret: this.SECRET_KEY,

        baseURL: this.BASE_URL,
      };

      const client = new APIBase(options);

      const res = await client.signRequest(
        'GET',
        '/api/v3/broker/sub-account/universalTransfer',
        body,
      );
      return res.data.result;
    } catch (e) {
      console.log('ERROR==mexc_getTransfers', e.message);
    }
  }
  async getSubAccountDetails(accountID) {
    try {
      const body = {
        accountType: 'SPOT',
        subAccount: accountID,
      };

      const options = {
        apiKey: this.API_KEY,
        apiSecret: this.SECRET_KEY,
        baseURL: this.BASE_URL,
      };

      const client = new APIBase(options);

      const res = await client.signRequest(
        'GET',
        '/api/v3/sub-account/asset',
        body,
      );
      return res.data;
    } catch (e) {
      console.log('ERROR==subDetails', e.message);
    }
  }

  // async trade(details) {
  //   const { asset, side, price, client_order_id, size } = details;
  //   const client = new Spot(this.API_KEY, this.SECRET_KEY, {
  //     baseURL: 'https://api.mexc.com',
  //   });

  //   const body = {
  //     symbol: `${asset}USDT`,
  //     side,
  //     type: 'LIMIT',
  //     price,
  //     newClientOrderId: client_order_id,
  //     quantity: size,
  //   };

  //   return client.Order(body).then((res) => {
  //     console.log('response:', res);
  //   });
  // }

  // async getOrder(details) {
  //   const { asset, side, price, amount, client_order_id, size } = details;
  //   const client = new Spot(this.API_KEY, this.SECRET_KEY, {
  //     baseURL: this.BASE_URL,
  //   });

  //   const body = {
  //     symbol: `${asset}USDT`,
  //     origClientOrderId: client_order_id,
  //   };

  //   client.QueryOrder(body).then((res) => {
  //     // client.AllOrders(body).then((res) => {
  //     console.log('response:', res);
  //   });

  //   // const response = await this.signedRequest("GET", `/api/v3/order`, body);
  //   // const response = await this.signedRequest("POST", `/api/v3/order`, body);
  //   // const response = await this.signedRequest(
  //   //   "GET",
  //   //   "/api/v3/broker/capital/deposit/subAddress",
  //   //   ""
  //   // );
  //   // console.log("response:", response.tranId);
  //   return;
  // }

  // async cancelOrder(details) {
  //   const { asset, client_order_id } = details;
  //   const client = new Spot(this.API_KEY, this.SECRET_KEY, {
  //     baseURL: this.BASE_URL,
  //   });

  //   const body = {
  //     symbol: `${asset}USDT`,
  //     origClientOrderId: client_order_id,
  //   };

  //   console.log('BODY:: ', body);

  //   client.CancelOrder(body).then((res) => {
  //     // client.AllOrders(body).then((res) => {
  //     console.log('response:', res);
  //   });

  //   // const response = await this.signedRequest("GET", `/api/v3/order`, body);
  //   // const response = await this.signedRequest("POST", `/api/v3/order`, body);
  //   // const response = await this.signedRequest(
  //   //   "GET",
  //   //   "/api/v3/broker/capital/deposit/subAddress",
  //   //   ""
  //   // );
  //   // console.log("response:", response.tranId);
  //   return;
  // }

  async DepositOrWithdrawAllowed(side, coin, network) {
    try {
      // const body = {
      //   apikey: "mx0vglwwgqEe2k0hnO",
      //   secretKey: "524544d4e6e649ec8a83e12de7c7d383",
      //   fromAccountType: "SPOT",
      //   toAccountType: "SPOT",
      //   asset,
      //   amount,
      // };

      console.log('req', 'DepositOrWithdrawAllowed');
      const response = await this.signedRequest(
        'GET',
        `/api/v3/capital/config/getall`,
      );

      // const response = await this.signedRequest(
      //   "GET",
      //   "/api/v3/broker/capital/deposit/subAddress",
      //   ""
      // );
      // console.log("response:", response);
      // const res = response.filter((x) => x.coin == coin);
      const res = response.find((x) => x.coin == coin);

      // console.log('res:', res);
      // console.log("res.networkList:", res.networkList);
      // console.log("res.networkList.length:", res.networkList.length);
      // console.log("res.networkList:", res.networkList[0]);
      // console.log("res.networkList:", res.networkList[1]);
      // console.log("res.networkList:", res.networkList[2]);

      let assetRes: any = {};
      if (res.networkList != 'undefined') {
        const asset = res.networkList.find(
          (x) => x.coin == coin && x.netWork == network,
        );

        console.log('asset:', asset);
        if (asset != undefined) {
          if (side.toLowerCase() == 'deposit') {
            // console.log("res.asset.depositEnabled:", asset.depositEnable);

            assetRes.enabled = asset.depositEnable;
            assetRes.network = asset.network;
          } else if (side.toLowerCase() === 'withdraw') {
            console.log('ASSET_withdraw:: ', asset);
            // assetRes.enabled = asset.withdrawEnable;
            assetRes.enabled = asset['withdrawEnable'];
            assetRes.withdraw_fee = asset['withdrawFee'];
            assetRes.withdraw_minsize = asset['withdrawMin'];
          }
        }
      }
      return assetRes;
    } catch (e) {
      this.mexcLogger('DepositOrWithdrawAllowed', e.message);
    }
  }

  buildQueryString(params) {
    if (!params) return '';
    return Object.entries(params).map(this.stringifyKeyValuePair).join('&');
  }

  stringifyKeyValuePair([key, value]) {
    let valueString;
    if (typeof value === 'object') {
      valueString = JSON.stringify(value);
    } else {
      valueString = value;
    }
    return `${key}=${encodeURIComponent(valueString)}`;
  }

  async getOrCreateSubAccAddress(user, coin, network) {
    try {
      const [created, fetched] = await Promise.allSettled([
        this.createSubAccountDepositAddress(user, coin, network),
        this.getSubAccountDepositAddress(user, coin, network),
      ]);

      // 1) Prioritize GET
      if (fetched.status === 'fulfilled' && fetched.value) {
        return fetched.value;
      }

      // 2) Then use CREATE
      if (created.status === 'fulfilled' && created.value) {
        return created.value;
      }

      // 3) Both failed → extract error safely
      const errorMsg =
        (fetched.status === 'rejected' && fetched.reason?.message) ||
        (created.status === 'rejected' && created.reason?.message) ||
        'Unable to get or create deposit address';

      throw new Error(errorMsg);
    } catch (err) {
      console.log('final error:', err);
      throw err;
    }
  }

  // async getAssetPrice() {
  //   try {
  //     const body = {
  //       symbol: 'BTCUSDT',
  //     };

  //     const options = {
  //       apiKey: this.API_KEY,
  //       apiSecret: this.SECRET_KEY,
  //       baseURL: this.BASE_URL,
  //     };

  //     const client = new APIBase(options);

  //     const res = await client.signRequest('GET', '/api/v3/ticker/24hr', body);

  //     console.log('RES==assetPrice', res);
  //     return {
  //       lastPrice: res.lastPrice,
  //       priceChangePercent: res.priceChangePercent,
  //     };
  //   } catch (e) {
  //     console.log('ERROR==assetPrice', e.message);
  //   }
  // }
}

// (async () => {
//   const mexc = new MexcService();
//   const body = {
//     api_key: "",
//     secret_key: "",
//   };
//   const time = 1763915536000;
//   const res = await mexc.getAssetPrice("kochureM34");
//   // const res = await mexc.getSubAccountDetails("kochureM34");
//   console.log("RES:: ", res);
// })();

// module.exports = new MexcService();
