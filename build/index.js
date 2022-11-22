const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const http = require('http')
const request = require('request')
const inquirer = require('inquirer')
const slash = require('slash')

const log = require('npmlog')
log.heading = 'gen-iconfont'
log.headingStyle = { bg: 'white', fg: 'blue' }
log.addLevel('success', { fg: 'white', bg: 'green', blob: true })

let IconName = 'icon-name'

inquirer
  .prompt([
    {
      type: 'input',
      name: 'question',
      message: 'Please input the iconFont link',
    },
    {
      type: 'input',
      name: 'iconName',
      message: 'Please input the iconFont name',
    },
  ])
  .then((answers) => {
    IconName = answers.iconName || IconName
    handleCssLink(answers)
  })
  .catch((error) => {
    console.log(error)
  })

function checkoutValid(question) {
  if (!/^(\/\/|https{0,1}:\/\/)at\.alicdn\.com\/.*\.css$/.test(question)) {
    log.error('invalid', `iconfont ${question} is invalid`)
    throw Error('iconfont link is invalid')
  }
}

// handleCssLink({ question: "//at.alicdn.com/t/font_1510439_vjhmpzctkep.css" });

function handleCssLink({ question }) {
  checkoutValid(question)
  question = /^https{0,1}:\/\//.test(question) ? question : 'http:' + question
  http.get(question, (res) => {
    res.setEncoding('utf8')
    var Data = ''
    res
      .on('data', function (data) {
        Data += data
      })
      .on('end', function () {
        handleCssData(Data)
        handleFontFile(Data)
      })
  })
}

function handleFontFile(Data) {
  const arrs = Data.match(/url\('(\S*)\?t=/g)
  const fonts = arrs.map((v) => v.match(/url\('(\S*)\?t=/)[1])
  fonts.forEach((v) => {
    const fontPath = /^https{0,1}:\/\//.test(v) ? v : 'http:' + v
    console.log(fontPath, 'fontPath')
    const vPath = v.replace(/(.*\/)*([^.]+)(.*)/gi, '$3')
    const fileName = `${IconName}${vPath}`
    let stream = fs.createWriteStream(path.join(fontMoveToPath, fileName))
    request(fontPath)
      .pipe(stream)
      .on('close', function (err) {
        if (err) {
          throw Error('字体下载失败')
        }
        log.success('dynamic-iconfont', '字体文件' + fileName + '下载完毕')
      })
  })
}
const fontMoveToPath = path.resolve(__dirname, slash('../icon/fonts'))

function execChmod(path) {
  const execFilter = path.replace(/(.*)\/{1}.*$/, '$1')
  const execPath = `sudo chmod 777 ${execFilter}`
  execSync(execPath)
}

function readAndWhiteFile(moveToPath, data) {
  execChmod(moveToPath)
  fs.writeFile(moveToPath, data, function (error) {
    if (error) {
      throw error
    }
    log.success('dynamic-iconfont', '拷贝icon数组js文件成功')
  })
}

const moveToPath = path.resolve(__dirname, slash('../icon/icon.scss'))

function handleCssData(Data) {
  let str
  str = Data.replace(/font-family: "iconfont"/g, `font-family:${IconName}`)
    .replace('.iconfont', `.${IconName}`)
    .replace(/\.icon-/g, `.${IconName}-`)
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, `./fonts/${IconName}.`)
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, `./fonts/${IconName}.`)
    .replace(/\/\/at\.alicdn\.com.*font_.*\./, `./fonts/${IconName}.`)
  execChmod(moveToPath)
  fs.writeFile(moveToPath, str, function (error) {
    if (error) {
      throw error
    }
    log.success('dynamic-iconfont', '拷贝css文件成功')
  })
}
