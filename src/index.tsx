import { Bindings } from "../bindings";
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'

export interface Bindings {
  TALK: KVNamespace;
  USER_ID: string;
  TOKEN: string;
  PUSH_URI: string;
}

const app = new Hono<Bindings>();

// ◆トップ画面表示
app.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>わか</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      </head>
      <body>
        <h2><a href="/">わかメール</a></h2>
        <div hx-get="/list" id="talk-list" hx-trigger="load"></div>
        <form id="talk-form"  >
          <p><input type="text" id="talkText" name="talkText" size="30" style="font-size:100%" /></p>
          <p><button  hx-post="/talk1" hx-target="ul" hx-swap="beforeend">わか送信<img src="https://storage.googleapis.com/sc-line-227913.appspot.com/105.png" style="max-width:50px;" /></button></P>
          <p><button  hx-post="/talk2" hx-target="ul" hx-swap="beforeend">まま送信<img src="https://storage.googleapis.com/sc-line-227913.appspot.com/103.png" style="max-width:50px;" /></button></p>
          <p><button  hx-post="/talk3" hx-target="ul" hx-swap="beforeend">ちち送信<img src="https://storage.googleapis.com/sc-line-227913.appspot.com/101.png" style="max-width:50px;" /></button></p>
        </form>
        <br/>
        <br/>
        <button hx-post="/reset">全てクリア</button>
        <script>
          document.addEventListener('htmx:afterSwap', function (event) {
            const talkText = document.getElementById('talkText');
            if (talkText) {
              talkText.value = '';
            }
          });
        </script>
      </body>
    </html>
  `)
})

// ◆一覧データ取得
app.get('/list', async (c) => {
  return await getList(c)
})

async function getList(c) {
  const rawTalks = await TALK.get("key")
  if (rawTalks == '') {
    return c.html(<ul></ul>)
  }
  const talks = rawTalks.split(',')
  const talkList = []
  talks.forEach((talk, index) => {
    talkList.push(<li key={index}>{talk}</li>)
  })
  return c.html(<ul>{talkList}</ul>)
}

// ◆POST受信。No.1ユーザ。LINE通知
app.post('/talk1', async (c) => {
  const talkText = (await c.req.parseBody())['talkText']
  await talk('わか', talkText)
  
  const response = await fetch(PUSH_URI, {
    method: 'POST',
    body: JSON.stringify({
      "to": USER_ID,
      "messages": [
        {
          "type": "text",
          "text": talkText,
        },
      ],
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TOKEN,
    },
  })
  return createRedirect()
})

// ◆POST受信。No.2ユーザ
app.post('/talk2', async (c) => {
  const talkText = (await c.req.parseBody())['talkText']
  await talk('まま', talkText)
  return createRedirect()
})

// ◆POST受信。No.3ユーザ
app.post('/talk3', async (c) => {
  const talkText = (await c.req.parseBody())['talkText']
  await talk('ちち', talkText)
  return createRedirect()
})

// ◆POST受信共通処理。受信したメッセージをKV保管する。過去10件まで保管
async function talk(who, talkText): Promise<String> {
  if (talkText == '') {
    return new Response(null, { status: 204 });
  }
  const oneTalk = who + ' ' + getDate() + ' ' + talkText.replace(',', '').replace('=', '')
  
  const rawTalks = await TALK.get("key")
  const talkarray = rawTalks.split(',')
  if (rawTalks == '') {
    await TALK.put("key",oneTalk)
  } else if (talkarray.length < 10) {
    await TALK.put("key",talkarray + ',' + oneTalk)
  } else {
    const miniTalks = talkarray.slice(talkarray.length - 9, talkarray.length)
    await TALK.put("key",miniTalks + ',' + oneTalk)
  }
}

// ◆日付取得（MM/dd hh:mm）
function getDate() {
  const today = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'})
  const day = today.slice(5,10).replace('-','/')
  const time = today.slice(11,16)
  return day + ' ' + time
}

// ◆リセット
app.post('/reset', async (c) => {
  await TALK.put("key","")
  return createRedirect()
})

// ◆リダイレクト
function createRedirect() {
  return new Response(null, { 
    status: 204,
    headers: {
      'HX-Redirect': '/',
    }
  });
}

app.fire()
