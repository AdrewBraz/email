import { ImapFlow } from "imapflow";
import { castArray } from "lodash";
import nodemailer from 'nodemailer';



const client = new ImapFlow({
    host: 'imap.yandex.ru',
    port: 993,
    auth: {
        user: 'andyWitman@yandex.ru',
        pass: 'Rem32123'
    },
    tls: {
        minVersion: "TLSv1"
    },
});

const imap = async () => {
    await client.connect();
    console.log('App connected to imap server')

    // const lock = await client.getMailboxLock('INBOX');

    // try{
    //     let messages = await client.fetch({seen: false}, {
    //         flage: true,
    //         envelope: true,
    //         source: false,
    //         bodyParts: true,
    //         bodyStructure: true,
    //         uid: true, 
    //       })
    //     console.log(messages)
    // } finally {
    //     lock.release();
    // }

    await client.logout();
}

export default imap
