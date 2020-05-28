const axios = require('axios');
const puppeteer = require('puppeteer');

class QQMusic{
    constructor() {
        this.apis = {
            "search_url": "http://c.y.qq.com/soso/fcgi-bin/search_for_qq_cp",
            "palysong_url": "https://i.y.qq.com/v8/playsong.html",
            "get_profile_url": "https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg",
            "get_profile_order_url": "https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg",
            "get_diss_songs_url": "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
        }
        this.agents = {
            "ios": "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46",
            "pc": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36 "
        }
        this.headers = {
            "referer": "http://m.y.qq.com",
            "User-Agent": this.agents['ios'],
            // cookie需要修改成自己的
            "cookie": "RK=tVxRokoXcL; ptcz=6df2117034b89cd2820ddec28b3c0c2352505c69e360bb70e7ca111cd6cddbbf; tvfe_boss_uuid=e155bd2ea83ffb98; pgv_pvid=539518098; pgv_pvi=4666180608; o_cookie=779956774; pac_uid=1_779956774; _ga=GA1.2.1955116147.1586427426; ts_uid=6271322552; ied_qq=o0779956774; yq_index=0; psrf_qqrefresh_token=80BECA7C17856BBD6FDF8D455B55CE66; psrf_qqaccess_token=F078F2EF1B84D5864A0CC263985B2556; psrf_qqopenid=313D7A65E793329F74A573F9548445E3; psrf_qqunionid=CF1BFCE2FBE1AA3DF287EEFFDCDC12D9; ts_refer=ADTAGmyqq.playsong.svr_err; pgv_info=ssid=s6185606875; pgv_si=s3295791104; skey=@CHNGrBqp6; uid=224144156; yqq_stat=0; ts_last=y.qq.com/; psrf_access_token_expiresAt=1597547255; qm_keyst=Q_H_L_2S-_1x50emMejqmenKNCIxYr4fVfAQTmLn-rsjCG1kfx8cCCPjVPjhKW39eqYFE; qqmusic_key=Q_H_L_2S-_1x50emMejqmenKNCIxYr4fVfAQTmLn-rsjCG1kfx8cCCPjVPjhKW39eqYFE; uin=779956774; psrf_musickey_createtime=1589771255; userAction=1"
        }
    }

    // 搜索音乐
    async search(keyword, n=10) {
        let url = `${this.apis.search_url}?w=${encodeURIComponent(keyword)}&format=json&p=1&n=${n}`;
        let res = await axios.get(url, {headers: this.headers});
        let songs;
        res.data.code === 0 && (songs = res.data.data.song.list.map(song => ({
            name: song.songname,
            singer: song.singer.map(singer => singer.name).join(' '),
            mid: song.songmid,
        })));
        return songs
    }

    // 获取音乐链接
    async getSongUrl(mid) {
        let url = `${this.apis.palysong_url}?songmid=${mid}&ADTAG=myqq&from=myqq&channel=10007100`;
        let res = await axios.get(url, {headers: this.headers});
        let text = res.data
        let audio = text.match(/\<audio[^>]*\>(([^<])*)/g);
        audio && audio.length && (audio = audio[0]);
        let result = audio.match(/src="(.*?)"/g);
        result && result.length && (result = result[0].substr(5, result[0].length-6))
        return result
    }

    // 获取歌单列表
    async getDissLists() {
        let dissList = []
        let params = {
            "g_tk_new_20200303": 925150183,
            "g_tk": 908742994,
            "loginUin": 123456789,
            "hostUin": 0,
            "format": "json",
            "inCharset": "utf8",
            "outCharset": "utf-8",
            "notice": 0,
            "platform": "yqq.json",
            "needNewCode": 0,
            "cid": 205360838,
            "ct": 20,
            "userid": 0,
            "reqfrom": 1,
            "reqtype": 0
        }
        let headers = {
            "cookie": this.headers['cookie'],
            "referer": "https://y.qq.com/portal/profile.html",
            "user-agent": this.agents['pc']
        }
        let res = await axios.get(this.apis['get_profile_url'], { params, headers })
        if(res.data.code !== 0) {
            await this.login();
            return await this.getDissLists();
        }
        let userid = res.data['data']['creator']['uin']
        let myLove = res.data['data']['mymusic'][0]
        dissList.push({
            "name": "我喜欢", 
            "dissid": myLove["id"],
            "num": myLove['num0']
        })
        dissList = dissList.concat(res.data['data']['mydiss']['list'].map(diss => ({
            "name": diss['title'],
            "dissid": diss['dissid'].toString(),
            "num": parseInt(diss['subtitle'].split('首')[0])
        })))
        params['cid'] = '205360956'
        params['reqtype'] = 3
        params['sin'] = 0
        params['ein'] = 10
        params['userid'] = userid
        res = await axios.get(this.apis['get_profile_order_url'], { params, headers })
        dissList = dissList.concat(res.data['data']['cdlist'].map(diss => ({
            "name": diss['dissname'],
            "dissid": diss['dissid'].toString(),
            "num": diss['songnum']
        })))
        return dissList
    }

    // 获取歌单音乐
    async getDissSongs(dissid, page=1, num=10) {
        let headers = {
            "cookie": this.headers['cookie'],
            "referer": "https://y.qq.com/portal/profile.html",
            "user-agent": this.agents['pc']
        }
        let params = {
            "type": 1,
            "json": 1,
            "utf8": 1,
            "onlysong": 1,
            "nosign": 1,
            "new_format": 1,
            "song_begin": (page - 1) * num,
            "song_num": num,
            "ctx": 1,
            "disstid": dissid,
            "_": 1588724818395,
            "g_tk_new_20200303": 925150183,
            "g_tk": 908742994,
            "loginUin": 123456789,
            "hostUin": 0,
            "format": "json",
            "inCharset": "utf8",
            "outCharset": "utf-8",
            "notice": 0,
            "platform": "yqq.json",
            "needNewCode": 0
        }
        let res = await axios.get(this.apis['get_diss_songs_url'], { params, headers })
        let songs = res.data['songlist']
        songs = songs.map(song => ({
            "name": song['name'],
            "mid": song['mid']
        }))
        return songs;
    }

    // 获取榜单
    // id: 60 抖音排行榜
    // https://i.y.qq.com/n2/m/index.html?tab=toplist 查看榜单id
    async getTopList(id) {
        let url = `https://i.y.qq.com/n2/m/share/details/toplist.html?ADTAG=myqq&from=myqq&channel=10007100&id=${id}`;
        let res  =  await axios.get(url, { headers: this.headers });
        let text = res.data;
        let scripts = text.match(/(<script>var firstPageData = )(.*?)(<\/script>)/g);
        scripts = scripts[0];
        scripts = JSON.parse(scripts.substr(27, scripts.length - 36))
        let songs = scripts.songInfoList.map(song => ({
            name: song.name,
            singer: song.singer.map(singer => singer.name).join(' '),
            mid: song.mid
        }))
        return songs;
    }

    // 登录
    async login() {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://y.qq.com');
        let cookie = '';
        const loginButton = await page.$('.js_login');
        await loginButton.click();
        while (true) {
          const cookies = await page.cookies();
          const uid = cookies.filter((cookie) => cookie.name == 'uin');
          if (uid.length) {
            cookie = cookies
              .map((cookie) => `${cookie.name}=${cookie.value}`)
              .join(';');
            break;
          }
        }
        this.headers.cookie = cookie;
        browser.close();
      }
    
}



class MusicPlugin{
    constructor() {
        this.service = "OS1194626903.music_demo"
        this.SLUG = 'QQMusic'
        this.page = 1;
        this.engine = new QQMusic()
    }
    // 接受参数
    // io: socket io
    // text: 语音识别结果
    // intent：意图对象
    async handle(io, text, intent) {
        let { intent: intent_name, slots} = intent.semantic[0];
        console.log(slots);
        let results;
        try{
            switch(intent_name) {
                case 'search_by_song':
                    let singer = slots.filter(slot => (slot.name == 'actor' || slot.name == 'artist'))
                    let song = slots.filter(slot => slot.name == 'song')
                    singer = singer.length ? singer[0].normValue : '';
                    song = song.length ? song[0].normValue : '';
                    let songs = await this.engine.search(`${singer} ${song}`);
                    songs = await Promise.all(songs.map(async song => ({
                        text: `${song.singer}的${song.name}`,
                        url: await this.engine.getSongUrl(song.mid)
                    })));
                    songs = songs.filter(song => song.url);
                    results = {cmd: 'play', data: { datas: songs }}
                    break;
                case 'control':
                    let cmd= slots.map(slot => slot.name);
                    cmd && cmd.length && (cmd = cmd[0]);
                    results = {cmd}
            }
        }catch(e) {
            results = {cmd: 'say', data: { text: `插件${this.SLUG}出故障了` }}
            console.log(e)
        }  
        return results;
    }

    IOHandle(io, data) {

        io.emit('client', {data});
    }
}

exports.MusicPlugin = MusicPlugin;
