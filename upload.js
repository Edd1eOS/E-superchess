// upload.js
const ci = require('miniprogram-ci');

(async () => {
  const project = new ci.Project({
    appid: 'wx0a96e22dd1feefc9',
    type: 'miniProgram',
    projectPath: 'd:/wechatdev/dup_superchess',
    privateKeyPath: 'd:/wechatdev/dup_superchess/private.key',
    ignores: ['node_modules/**/*']
  });

  try {
    const uploadResult = await ci.upload({
      project,
      version: '1.0.0',
      desc: '正式版上线',
      setting: {
        es6: true,
        postcss: true,
        minified: true,
        enhance: true
      }
    });
    console.log('上传成功!', uploadResult);
  } catch (err) {
    console.error('上传失败:', err.message);
  }
})();