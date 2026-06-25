import express,{Request,Response} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import {validationResult,body} from 'express-validator'
import {MsEdgeTTS,OUTPUT_FORMAT} from 'msedge-tts'
const rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    legacyHeaders:false,
    message:"Too many requests. Try again later."
})
const app = express()
app.use('trust proxy',1)
app.use(rateLimiter)
app.use(cors())
app.use(helmet())
app.use(express.json())
app.post("/convert",[
    body("text").trim().escape(),
    body("voice").trim().escape().isString()
],async (req:Request,res:Response)=>{
    res.setHeader('Content-Type','audio/webm')
    const errs = validationResult(req)
    if(!errs.isEmpty()){
        return res.status(400)
    }
    try{
        const tts = new MsEdgeTTS()
    await tts.setMetadata(req.body.voice,OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)
    const {audioStream} = tts.toStream(req.body.text)
    const audioChunks:any[] = []
    audioStream.on("data",(data)=>{
        audioChunks.push(data)
    })
    audioStream.on("end",()=>{
        return res.status(200).send(Buffer.concat(audioChunks))
    })
    audioStream.on("error",()=>{
        return res.status(500)
    })
    } catch(e){}
})
app.listen(8080)