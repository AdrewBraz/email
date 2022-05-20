import { CronJob } from 'cron';
import Imap from 'imap'
import { castArray, result } from "lodash";
import nodemailer from 'nodemailer';
import fs from 'fs'
import { promisify } from 'util';



import excludedMails from './excludedMails';

const imap = new Imap({
    user: 'andyWitman@yandex.ru',
    password: 'Rem32123',
    host: 'imap.yandex.ru',
    port: 993,
    tls: {
      secureProtocol: "TLSv1_method"
  },
    keepalive: {
      forceNoop: true
    }
});


const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8')

//   let info = await transporter.sendMail({
//       from: 'smprknpk@ya.ru',
//       to: email,
//       subject: subject,
//       html
//   })
// }
const openBox = promisify(imap.openBox.bind(imap))
const fetch = promisify(imap.fetch.bind(imap))
const search = promisify(imap.search.bind(imap))
const answerFunc = async (results) => {
  console.log('smth')
  const f = await fetch(results, { bodies: 'HEADER', struct: true, envelope: true })
  f.on('message', function(msg, seqno) {
    console.log('Message #%d', seqno);
    let prefix = '(#' + seqno + ') ';
    msg.once('attributes', (attrs) => {
      addAttrs(attrs)
    });
    msg.once('end', function() {
      console.log(prefix + 'Finished');
    });
  });
  f.once('error', function(err) {
    console.log('Fetch error: ' + err);
  });
  f.on('end', () => {
    console.log('event')
    imap.end()
    imap.destroy()
    console.log('connection closed')
  })
}

const state = {
  messages: []
}

const addAttrs = (attrs) => {
  const { subject, sender } = attrs.envelope;
  const { uid, flags } = attrs;
  const { messages } = state;
  const email = `${sender[0].mailbox}@${sender[0].host}`;
  if(!excludedMails.includes(email)){
    messages.push({uid, email, subject, flags})
    console.log(messages)
  }
  return null
}

const connectFunc = async () => {
    const {seqnos, messages} = state;
    console.log('open box')
    await openBox('INBOX', false)
      .then(box => console.log(box))
      .catch(err => console.log(err))
    await search([ 'UNSEEN', ['SINCE', 'Apr 01, 2021'] ])
      .then((results) => {
        if(results.length > 0){
          const f =  imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true })
          f.on('message', function(msg, seqno) {
            console.log('Message #%d', seqno);
            let prefix = '(#' + seqno + ') ';
            msg.once('attributes', (attrs) => {
              addAttrs(attrs)
            });
            msg.once('end', function() {
              console.log(prefix + 'Finished');
            });
          });
          f.once('error', function(err) {
            console.log('Fetch error: ' + err);
          })
          f.on('end', () => {
            console.log('stream closed')
          })
        }
      })
      .catch(err => console.log(err))

}

const main = () => {
  console.log('start')
  imap.once('ready', connectFunc)
  imap.connect()
}

// console.log('start')
//   imap.once('ready', connectFunc)
//   imap.once('error', function(err) {
//     console.log(err + '  watta fuck');
//   });
//   imap.connect()

const job = new CronJob(
  '0 */1 * * * *',
  () => {
    console.log('message')
    main()
  },
  null,
  true
)

job.start()