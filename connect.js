export default (imap) => {
    const intervalConnect = false;
    const launchIntervalConnect =() => {
        imap.destroy();
        console.log("connection closed")
        imap.connect()
        console.log("connection reopened")
    }
    
    const clearIntervalConnect =() => {
        if(false == intervalConnect) return
        clearInterval(intervalConnect)
        intervalConnect = false
    }
    imap.on('error', (err) => {
      console.log(err.code, 'TCP ERROR')
      launchIntervalConnect()
    })
    imap.on('close', launchIntervalConnect)
    imap.on('end', launchIntervalConnect)

    const reconnect = () => {
        clearIntervalConnect()
        imap.connect()
    }

    reconnect()
}