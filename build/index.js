const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const request = require("request");
const inquirer = require("inquirer");
const slash = require("slash");

const log = require("npmlog");
log.heading = "gen-iconfont";
log.headingStyle = { bg: "white", fg: "blue" };
log.addLevel("success", { fg: "white", bg: "green", blob: true });

inquirer
  .prompt([
    {
      type: "input",
      name: "question",
      message: "Please input the iconFont link",
    },
  ])
  .then((answers) => {
    handleCssLink(answers);
  })
  .catch((error) => {
    console.log(error);
  });

function checkoutValid(question) {
  if (
    !/^(\/\/|https{0,1}:\/\/)at\.alicdn\.com\/.*_3640573_.*\.css$/.test(
      question
    )
  ) {
    log.error("invalid", "iconfont link is invalid");
    throw Error("iconfont link is invalid");
  }
}

// handleCssLink({ question: "//at.alicdn.com/t/font_1510439_vjhmpzctkep.css" });

function handleCssLink({ question }) {
  checkoutValid(question);
  question = /^https{0,1}:\/\//.test(question) ? question : "http:" + question;
  http.get(question, (res) => {
    res.setEncoding("utf8");
    var Data = "";
    res
      .on("data", function (data) {
        Data += data;
      })
      .on("end", function () {
        handleCssData(Data);
        handleJsData(Data);
        handleFontFile(Data);
      });
  });
}

function handleFontFile(Data) {
  const arrs = Data.match(/url\('(\S*)\?t=/g);
  const fonts = arrs.map((v) => v.match(/url\('(\S*)\?t=/)[1]);
  fonts.forEach((v) => {
    const fontPath = /^https{0,1}:\/\//.test(v) ? v : "http:" + v;
    console.log(fontPath, "fontPath");
    const vPath = v.replace(/(.*\/)*([^.]+)(.*)/gi, "$3");
    const fileName = `yl-font${vPath}`;
    let stream = fs.createWriteStream(path.join(fontMoveToPath, fileName));
    request(fontPath)
      .pipe(stream)
      .on("close", function (err) {
        if (err) {
          throw Error("字体下载失败");
        }
        log.success("yl-tech", "字体文件" + fileName + "下载完毕");
      });
  });
}
const fontMoveToPath = path.resolve(
  __dirname,
  slash("../packages/yl-ui/components/icon/src/fonts")
);

const jsonMoveToPath = path.resolve(
  __dirname,
  slash("../docs/.vuepress/components/common/constant/icons.js")
);

function execChmod(path) {
  const execFilter = path.replace(/(.*)\/{1}.*$/, "$1");
  const execPath = `sudo chmod 777 ${execFilter}`;
  execSync(execPath);
}

function readAndWhiteFile(moveToPath, data) {
  execChmod(moveToPath);
  fs.writeFile(moveToPath, data, function (error) {
    if (error) {
      throw error;
    }
    log.success("yl-tech", "拷贝icon数组js文件成功");
  });
}

function handleJsData(Data) {
  const arrs = Data.match(/\.icon-(\S*):before/g);
  const icons = arrs.map((v) => v.match(/\.icon-(\S*):before/)[1]);
  const str = "export default" + JSON.stringify(icons);
  readAndWhiteFile(jsonMoveToPath, str);
}

const moveToPath = path.resolve(
  __dirname,
  slash("../packages/yl-ui/components/icon/src/icon.scss")
);

function handleCssData(Data) {
  let str;
  str = Data.replace(/font-family: "iconfont"/g, 'font-family: "yl-icon"')
    .replace(".iconfont", ".yl-icon")
    .replace(/\.icon-/g, ".yl-icon-")
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, "./fonts/yl-font.")
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, "./fonts/yl-font.")
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, "./fonts/yl-font.");
  execChmod(moveToPath);
  fs.writeFile(moveToPath, str, function (error) {
    if (error) {
      throw error;
    }
    log.success("yl-tech", "拷贝css文件成功");
  });
}
