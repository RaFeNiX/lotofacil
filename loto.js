const request = require("request")
const fs = require('fs')
const AdmZip = require("adm-zip")
const tabletojson = require('tabletojson')
const jsonfile = require('jsonfile')
const argv = require('minimist')(process.argv.slice(2))
const _ = require('lodash')

const filePath = "./files"
const zipPath = filePath + "/loto.zip"
const jsonPath = filePath + "/data.json"

console.log("ficar vendo ",argv)
console.info('####  INICIO  ####')

function downloadLotoFile() {
    let options = { method: 'GET',
    url: 'http://www1.caixa.gov.br/loterias/_arquivos/loterias/D_lotfac.zip',
    headers: 
     { 'postman-token': '2c3bde59-d348-d958-91c2-a02904a58c2d',
       'cache-control': 'no-cache',
       cookie: 'security=true',
       'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
       'accept-encoding': 'gzip, deflate',
       accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
       'upgrade-insecure-requests': '1',
       'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36' } };
    return new Promise(function (resolve) {    
        if(argv.nd && (fs.existsSync(zipPath) || fs.existsSync(jsonPath))){
            console.info("Não foi necessário fazer download")
            return resolve()    
        } 
        console.info("Iniciando download do arquivo")
        if(fs.existsSync(zipPath)) fs.unlink(zipPath)
        request(options)
            .pipe(fs.createWriteStream(zipPath))
            .on('close', function () {
                console.info("Finalizando download do arquivo")
                resolve()
            })
    })
}
function tratarZipdataParaJSON() {
    return new Promise(function(resolve){
        var zipEntries = new AdmZip(zipPath).getEntries()
        var zipdata = removerAcentos(zipEntries[0].getData().toString())
        var tablesAsJson = tabletojson.convert(zipdata)
        jsonfile.writeFile(jsonPath, { "completo": tablesAsJson[0] }, { spaces: 2, EOL: '\r\n', flag: 'a' })
        resolve()
    })
}
function alimentarDB() {
    console.info("Inserindo informações no DB")
    if(!argv.db) return false
    return new Promise(function(resolve){
        const mongoose = require('mongoose')
        mongoose.connect('mongodb://localhost/test', { useMongoClient: true })
        mongoose.Promise = global.Promise
        var thingSchema = new mongoose.Schema({}, { strict: false })
        var Sorteio = mongoose.model('Sorteio',thingSchema)
        jsonfile.readFile(jsonPath, function(err, obj) {
            obj.completo.forEach(element => {
                console.log(element)
                var resultado = new Sorteio({"meme":"red","sagui":true})
                resultado.save()
            })
            resolve()
        })
        console.info("DB OK")
    })
}
function removerArquivos() {
    console.info("Removendo arquivo JSON")
    fs.unlink(jsonPath)
    if(!argv.m && !argv.nd){
        console.info("Removendo arquivo ZIP")
        fs.unlink(zipPath)
    }
    return true
}
function removerAcentos(newStringComAcento) {
    var string = newStringComAcento
    var mapaAcentosHex = {
        a: /[\xE0-\xE6]/g,
        A: /[\xC0-\xC6]/g,
        e: /[\xE8-\xEB]/g,
        E: /[\xC8-\xCB]/g,
        i: /[\xEC-\xEF]/g,
        I: /[\xCC-\xCF]/g,
        o: /[\xF2-\xF6]/g,
        O: /[\xD2-\xD6]/g,
        u: /[\xF9-\xFC]/g,
        U: /[\xD9-\xDC]/g,
        c: /\xE7/g,
        C: /\xC7/g,
        n: /\xF1/g,
        N: /\xD1/g,
    }

    for (var letra in mapaAcentosHex) {
        var expressaoRegular = mapaAcentosHex[letra]
        string = string.replace(expressaoRegular, letra)
    }

    return string
}

function executar() {
    return downloadLotoFile()
        .then(tratarZipdataParaJSON)
        .then(alimentarDB)
        .then(removerArquivos)
}

executar().then(function(){
    console.info('####  FIM  ####')
})