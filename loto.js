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
        if(!argv.a && (fs.existsSync(zipPath) || fs.existsSync(jsonPath))){
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
        // var zipdata = removerAcentos(zipEntries[0].getData().toString())
        // var tablesAsJson = tabletojson.convert(zipdata)
        var tablesAsJson = tabletojson.convert(zipEntries[0].getData().toString())
        jsonfile.writeFile(jsonPath, { "completo": tablesAsJson[0] }, { spaces: 2, EOL: '\r\n', flag: 'a' })
        resolve()
    })
}
function alimentarDB() {
    console.info("Iniciando DB")
    if(!argv.db) return false
    console.info("Inserindo informações no DB")
    return new Promise(function(resolve,reject){
        const mongoose = require('mongoose')
        const _progress = require('cli-progress')
        var bar1 = new _progress.Bar({
            format: '{ inserindo no banco [{bar}] {percentage}% | {value}/{total} }'
        }, _progress.Presets.shades_classic);
        mongoose.connect('mongodb://localhost/test', { useMongoClient: true })
        mongoose.Promise = global.Promise
        var thingSchema = new mongoose.Schema({}, { strict: false })
        var Sorteio = mongoose.model('Sorteio',thingSchema)
        jsonfile.readFile(jsonPath, function(err, obj) {
            try {
                bar1.start(obj.completo.length, 0);
                obj.completo.forEach(function(element,i){
                    bar1.update(i);
                    var resultado = new Sorteio(JSON.parse(JSON.stringify(element)))
                    resultado.save()
                })                
                bar1.stop();
                resolve()
            } catch (e) {
                console.log("not JSON", e);
                reject(e)
            }
        })
        console.info("DB OK")
    })
}
function removerArquivos() {
    return true
    console.info("Removendo arquivo JSON")
    fs.unlink(jsonPath)
    if(!argv.m){
        console.info("Removendo arquivo ZIP")
        fs.unlink(zipPath)
    }
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