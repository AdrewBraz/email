import { CronJob } from 'cron';
import Imap from 'imap'
import { castArray, result } from "lodash";
import nodemailer from 'nodemailer';
import fs from 'fs'
import { isEqual } from 'lodash';
import { promisify } from 'util';
import excludedMails from './excludedMails';
import { Console } from 'console';

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

const state = {
  messages: []
}

const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8')

const openBox = promisify(imap.openBox.bind(imap))
const search = promisify(imap.search.bind(imap))
const fetch = async (results, transporter) => {
  const f =  imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true })
  f.on('message', function(msg, seqno) {
    console.log('Message #%d', seqno);
    let prefix = '(#' + seqno + ') ';
    msg.once('attributes', async (attrs) => {
      addAttrs(attrs)
      console.log(shouldBeAnswered(attrs.uid, attrs.flags))
      // if(shouldBeAnswered(attrs.uid, attrs.flags)){
      //   await  transporter.sendMail({
      //     from: 'andyWitman@yandex.ru',
      //     to: email,
      //     subject: subject,
      //     html
      //   })
      // }
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
    transporter.close()
    imap.destroy()
    console.log('connection closed')
  })
}

const addAttrs = (attrs) => {
  const { subject, sender } = attrs.envelope;
  const { uid, flags } = attrs;
  const { messages } = state;
  const email = `${sender[0].mailbox}@${sender[0].host}`;
  if(!excludedMails.includes(email) && !messages.find(el => uid === el.uid)){
    messages.push({uid, email, subject, flags})
    console.log(messages)
  }
  return null
}

const shouldBeAnswered = (uid, flags) => {
  const { messages } = state;
  const mail = messages.find(item => item.uid === uid);
  const oldFlags = mail.flags
  console.log( !isEqual(oldFlags, flags))
  return (!isEqual(oldFlags, flags) && flags.includes('Seen'))
}

const connectFunc = async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 587,
    secure: false,
    auth: {
      user: 'andyWitman@yandex.ru',
      pass: 'Rem32123'
    }
  })
    console.log('open box')
    await openBox('INBOX', false)
      .then(box => console.log(box))
      .catch(err => console.log(err))
    await search([ 'ALL', ['SINCE', 'Apr 01, 2021'] ])
      .then((results) => {
        if(results.length > 0){
          fetch(results, transporter)
        }
      })
      .catch(err => console.log(err))

}

const main = () => {
  console.log('start')
  imap.once('ready', connectFunc)
  imap.connect()
}

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