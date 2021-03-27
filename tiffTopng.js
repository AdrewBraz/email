import fs from 'fs'
import { readdir } from 'fs/promises'
import ConvertTiff from 'tiff-to-png';
import gm from 'gm';

const options = {
    logLevel: 1
  };
   
const converter = new ConvertTiff(options);

const pathName = `\\\\172.16.11.205\\mc_scans\\2021\\03`

let dirNames = fs.readdirSync(pathName).filter(item => parseInt(item, 10) >= 1555 )

// dirNames.forEach(item => {
//     const f = fs.readdirSync(`${pathName}\\${item}`).filter( i => i.slice(-5) !== '.tiff')
//     f.forEach( dir => {
//         fs.rmdirSync(`${pathName}\\${item}\\${dir}`, { recursive: true });
//     })
// })





dirNames.slice(0, 10).forEach(async item => {
  console.log(item)
  let fileNames = await readdir(`${pathName}\\${item}`);
  fileNames.forEach(async (name) => {
    await gm(`${pathName}\\${item}\\${name}`)
      .write(`${pathName}\\${item}\\${name.slice(0, name.length - 5)}.jpeg`, function (err) {
        if (err) console.log(err);
    }); 
    console.log('written')
  })
})