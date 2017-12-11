const request = require("request");
const fs = require('fs');
const AdmZip = require("adm-zip");
const tabletojson = require('tabletojson');
const jsonfile = require('jsonfile');
const argv = require('minimist')(process.argv.slice(2));

const filePath = "./files";
const zipPath = filePath + "/loto.zip";
const jsonPath = filePath + "/data.json";

console.log("ficar vendo ",argv)

function downloadLotoFile() {
    let options = {
        method: 'GET',
        url: 'http://www1.caixa.gov.br/loterias/_arquivos/loterias/D_lotfac.zip',
        headers: {
            'cache-control': 'no-cache',
            cookie: '_pk_ref.4.968f=%5B%22%22%2C%22%22%2C1507568980%2C%22https%3A%2F%2Fwww.google.com.br%2F%22%5D; _pk_id.4.968f=ca07f4ef4dde32ff.1507568980.1.1507568990.1507568980.; _pk_ses.4.968f=*; _ga=GA1.3.750979606.1507568990; _gid=GA1.3.211084725.1507568990; security=true',
            'accept-encoding': 'gzip, deflate',
            referer: 'http://resultadolotofacil.org/download-resultados/'
        }
    }
    return new Promise(function (resolve) {    
        if(argv.nd && (fs.existsSync(zipPath) || fs.existsSync(jsonPath))) resolve();    
        console.info("Iniciando download do arquivo");
        if(fs.existsSync(zipPath)) fs.unlink(zipPath);
        request(options)
            .pipe(fs.createWriteStream(zipPath))
            .on('close', function () {
                console.info("Finalizando download do arquivo");
                resolve();
            });
    })
}
function tratarZipdataParaJSON() {
    var zipEntries = new AdmZip(zipPath).getEntries();
    var zipdata = removerAcentos(zipEntries[0].getData().toString());
    var tablesAsJson = tabletojson.convert(zipdata);
    var file = jsonPath
    jsonfile.writeFile(file, { "completo": tablesAsJson[0] }, { spaces: 2, EOL: '\r\n', flag: 'a' })
}
function alimentarDB() {
    if(!argv.db) return false
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/test', { useMongoClient: true });
    mongoose.Promise = global.Promise;
    
    var thingSchema = new mongoose.Schema({}, { strict: false });
    var Sorteio = mongoose.model('Sorteio',thingSchema);
    
    var resultado = new Sorteio({"meme":"red","sagui":true});
    return resultado.save();
}
function removerArquivos() {
    fs.unlink(jsonPath);
    if(!argv.m){
        fs.unlink(zipPath);
    }
    return true;
}
function removerAcentos(newStringComAcento) {
    var string = newStringComAcento;
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
    };

    for (var letra in mapaAcentosHex) {
        var expressaoRegular = mapaAcentosHex[letra];
        string = string.replace(expressaoRegular, letra);
    }

    return string;
}

function executar() {
    return downloadLotoFile()
        .then(tratarZipdataParaJSON)
        .then(removerArquivos)
        .then(alimentarDB)
}

executar().then(function(){
    console.log('pronto')
})