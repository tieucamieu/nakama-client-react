import React, { useEffect, useState } from 'react'
import {Channel, Client, Session, Socket} from "@heroiclabs/nakama-js";
import { message, Modal } from 'antd';

export default function App() {
  const [loginState, setLoginState] = useState<boolean>(false);
  const [client, setClient] = useState<Client | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channelCode, setChannelCode] = useState<string>("general");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [chatList, setChatList] = useState<{
    channel_id: string;
    code: number;
    content: {
      message: string;
    }
    create_time: string;
    message_id: string;
    persistent: boolean;
    room_name: string;
    sender_id: string;
    update_time: string;
    username: string;
  }[]>([])
  useEffect(() => {
    /* Khởi tạo client */
    var useSSL = false; // Enable if server is run with an SSL certificate.
    var client = new Client("defaultkey", "127.0.0.1", "7350", useSSL);
    if(client) {
      setClient(client)
    }
  }, [])

  async function getAccount(session: Session) {
    const account = await client?.getAccount(session)
    setAccount(account)
  }

  async function getSocket(session: Session) {
    const secure = false; // Enable if server is run with an SSL certificate
    const trace = false;
    const socket = client?.createSocket(secure, trace);
    if(!socket) return
    await socket.connect(session, false); 
    setSocket(socket)
  }

  useEffect(() => {
    if(!window.localStorage.getItem("nkauthtoken")) return
    if(!window.localStorage.getItem("nkrefreshtoken")) return
    const authtoken = window.localStorage.getItem("nkauthtoken") || "";
    const refreshtoken = window.localStorage.getItem("nkrefreshtoken") || "";
    let session = Session.restore(authtoken, refreshtoken);
    getAccount(session)
    getSocket(session)
    setLoginState(true)
  }, [client])


  async function getChannel(roomname: string, type: number, persistence: boolean, hidden: boolean) {
    const channel = await socket?.joinChat(roomname, type, persistence, hidden);
    if(!channel) return
    setChannel(channel)
  }

  useEffect(() => {
    if(!socket) return
    /* Lắng nghe những kênh chat đang join => log ra */
    socket.onchannelmessage = (message) => {
        setChatList([message, ...chatList])
    };

    getChannel(channelCode, 1, false, false);

  }, [socket, channelCode, chatList])
  return (
    <>
      {
        loginState ? (
          <div className='boxChat'>
                <h2>Xin Chào: {account?.user.username}</h2>
                <h3>Nakama Box Chat - Kênh: {channelCode}
                  <button onClick={() => {
                    let newChannel = window.prompt("Nhập kênh chat") || "general";
                    setChannelCode(newChannel);
                  }}>change</button>
                </h3>
                
                <div>
                  <input id='chat_input' type="text" placeholder='chat content'/>
                  <button onClick={() => {
                    const content = { "message":  (document.querySelector("#chat_input") as HTMLInputElement).value};
                    if(channel) socket?.writeChatMessage(channel.id, content);
                    (document.querySelector("#chat_input") as HTMLInputElement).value = "";
                  }}>send</button>
                </div>
                <div>
                  {
                    chatList.map(chat => (
                      <p>
                        <b>{chat.username}</b>:
                        <span>{chat.content.message}</span>
                        <i style={{fontSize: "10px"}}>{chat.create_time}</i>
                      </p>
                    ))
                  }
                </div>
          </div>
        ) : (
          <form onSubmit={async (e: React.FormEvent) => {
            e.preventDefault();
            let data = {
              email: (e.target as any).email.value,
              password: (e.target as any).password.value
            }
            try {
              const session = await client?.authenticateEmail(data.email, data.password);
              if(!session) throw false
              localStorage.setItem("nkauthtoken", session?.token)
              localStorage.setItem("nkrefreshtoken", session?.refresh_token)
              Modal.success({
                title: "Thông báo",
                content: "Đăng nhập thành công!",
                onOk: () => {
                  window.location.reload();
                },
                onCancel: () => {
                    window.location.reload();
                }
              })
            }catch(err) {
              message.error("Lỗi đăng nhập!")
            }

          }} className='form_login'>
              <div>
                Email: <input name='email' type="email" placeholder='your email' />
              </div>
              <div>
                Password: <input name='password' type="password" placeholder='your password'/>
              </div>
              <button type='submit'>Login</button>
          </form>
        )
      }
    </>
  )
}
