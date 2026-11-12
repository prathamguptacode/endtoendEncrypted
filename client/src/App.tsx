import { useEffect, useState } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:3000")

function App() {


  useEffect(() => {
    (async () => {
      const key = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
      )
      const ex = await window.crypto.subtle.exportKey("spki", key.publicKey)
      const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(ex));
      const exportedAsBase64 = window.btoa(exportedAsString);
      const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
      console.log(pemExported)

      const message = "Hello World!"
      const enc = new TextEncoder()
      const encrypt = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, key.publicKey, enc.encode(message))
      const exportedAsStrings = String.fromCharCode.apply(null, new Uint8Array(encrypt));
      const exportedAsBase64s = window.btoa(exportedAsStrings);
      console.log("encrypted: ", exportedAsBase64s);


      const decrypt = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, key.privateKey, encrypt)
      const decoder = new TextDecoder()
      console.log("decrypted ", decoder.decode(decrypt))

    })()
  }, [])




  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null)

  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)

  const [messages, setMessages] = useState<string[]>([])

  const [inp, setInp] = useState("")

  console.log("state public key ", publicKey)
  console.log("state private key", privateKey)

  useEffect(() => {

    socket.on("connect", async () => {
      console.log("socket id ", socket.id)

    })

    socket.on("receive", async e => {

      if (publicKey && privateKey) {
        console.log("came ")

        const binary = window.atob(e.message);

        const encryptedBytes = Uint8Array.from(
          binary,
          char => char.charCodeAt(0)
        );

        const decrypt = await window.crypto.subtle.decrypt({ name: "RSA-OAEP", }, privateKey, encryptedBytes)
        const decoder = new TextDecoder()
        const m = decoder.decode(decrypt)
        console.log("decrypted ", m)
        setMessages(prev => [...prev, "friend: " + m])
        return
      }

      setMessages(prev => [...prev, "friend: " + e.message])
    })


    socket.on("receiveKey", async e => {
      const pem = e.publicKey
      const base64 = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s/g, "");

      const binary = atob(base64);

      const bytes = Uint8Array.from(
        binary,
        char => char.charCodeAt(0)
      );

      const key = await window.crypto.subtle.importKey("spki", bytes, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"])
      setPublicKey(key)

    })


  }, [socket, publicKey, privateKey])




  async function handleMessage(e: string) {
    setMessages(prev => [...prev, e])
    setInp("")
    if (publicKey) {
      const enc = new TextEncoder()
      const encrypt = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, enc.encode(e))
      const exportedAsStrings = String.fromCharCode.apply(null, new Uint8Array(encrypt));
      const exportedAsBase64s = window.btoa(exportedAsStrings);
      // console.log("encrypted: ", exportedAsBase64s);
      socket.emit("message", { message: exportedAsBase64s })
      return
    }
    socket.emit("message", { message: inp })
  }

  async function handleKeyExchange(e: string) {

    //exchange key on connect
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
    setPrivateKey(keyPair.privateKey)
    const publicKeyPemBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey)
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(publicKeyPemBuffer));
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
    socket.emit("key", { publicKey: pemExported, username: e })

  }



  return (
    <div className="main">
      <div className="messageArea">
        <input placeholder="username" onKeyDown={e => {
          if (e.key == "Enter") {
            handleKeyExchange(e.currentTarget.value)
          }
        }} />
        {messages.map((e, i) => <div key={i} className="message">{e}</div>)}
      </div>
      <div className="bar"> <input placeholder="message" value={inp} onChange={e => setInp(e.currentTarget.value)} onKeyUp={e => {
        if (e.key == "Enter") {
          handleMessage("me: " + inp)
        }
      }} /> </div>
    </div>
  )
}

export default App
