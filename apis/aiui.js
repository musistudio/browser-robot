const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let APPID = '59b38883';
let API_KEY = '3d5bdb66084e4ec49ad7ca0d7e03eb1b';
let AUTH_ID = '40d7cb21b69185d360190d73030ac4ac';
let AUE = 'raw';
let SAMPLE_RATE = '16000';
let DATA_TYPE = 'audio';
let SCENE = 'main_box';
let LAT = '39.938838';
let LNG = '116.368624';
let RESULT_LEVEL = 'plain';

let param = JSON.stringify({
  result_level: RESULT_LEVEL,
  aue: AUE,
  scene: SCENE,
  auth_id: AUTH_ID,
  data_type: DATA_TYPE,
  sample_rate: SAMPLE_RATE,
  lat: LAT,
  lng: LNG,
});
let md5 = (text) => crypto.createHash('md5').update(text).digest('hex');

async function getNLP(data) {
  let X_CurTime = Math.floor(Date.now() / 1000);
  let X_Param = new Buffer.from(param).toString('base64');
  let X_CheckSum = md5(API_KEY + X_CurTime + X_Param);
  let res = await axios({
    method: 'POST',
    url: 'http://openapi.xfyun.cn/v2/aiui',
    headers: {
      'X-Param': X_Param,
      'X-CurTime': X_CurTime,
      'X-CheckSum': X_CheckSum,
      'X-Appid': APPID,
    },
    data,
  });
  return res;
}

exports.getNLP = getNLP;
