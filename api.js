var GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxTSUR_ZFoVMN1XCrytK90eQfsYwezfGDK6z8cbIyq5s8f_Qa7sAbN_kISGStO1BEmZRA/exec';

var apiCache = {};
var CACHE_TIME = {
  getSubjectStructureLight: 10 * 60 * 1000,
  getQuestions: 30 * 60 * 1000,
  getMyStats: 5 * 60 * 1000,
  default: 1 * 60 * 1000
};
var pendingCount = 0;

function callGAS(functionName, params) {
  if (!params) params = {};
  var cacheKey = functionName + '_' + JSON.stringify(params);
  
  if (apiCache[cacheKey]) {
    var cached = apiCache[cacheKey];
    if (Date.now() - cached.time < cached.ttl) {
      console.log('キャッシュから表示:', functionName);
      return Promise.resolve(cached.data);
    }
    delete apiCache[cacheKey];
  }
  
  if (pendingCount >= 2) {
    return new Promise(function(resolve) {
      setTimeout(function() { resolve(callGAS(functionName, params)); }, 200);
    });
  }
  
  pendingCount++;
  console.log('GASに問い合わせ中:', functionName);
  
  return fetch(GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ function: functionName }, params)),
    credentials: 'include'
  })
  .then(function(response) {
    if (!response.ok) throw new Error('通信エラー: ' + response.status);
    return response.json();
  })
  .then(function(data) {
    pendingCount--;
    if (data.error) throw new Error(data.error);
    var ttl = CACHE_TIME[functionName] || CACHE_TIME.default;
    apiCache[cacheKey] = { data: data, time: Date.now(), ttl: ttl };
    console.log('取得成功:', functionName);
    return data;
  })
  .catch(function(error) {
    pendingCount--;
    console.error('通信エラー:', error.message);
    throw error;
  });
}
