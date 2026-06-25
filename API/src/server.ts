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
app.set('trust proxy', true)
app.use(cors())
app.use(helmet())
app.use(express.json())
app.post("/convert",[
    body("text").trim().escape(),
    body("voice").trim().escape().isString()
],async (req:Request,res:Response)=>{
    const errs = validationResult(req)
    if(!errs.isEmpty()){
        return res.status(400).json({ errors: errs.array() })
    }
    try{
        const tts = new MsEdgeTTS()
        await tts.setMetadata(req.body.voice,OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)
        const {audioStream} = tts.toStream(req.body.text)
        const audioBuffer = await new Promise<Buffer>((resolve,reject)=>{
            const audioChunks: Buffer[] = []
            audioStream.on("data",(data)=>{
                audioChunks.push(data)
            })
            audioStream.on("end",()=>{
                resolve(Buffer.concat(audioChunks))
            })
            audioStream.on("error",(err)=>{
                reject(err)
            })
        })
        res.setHeader('Content-Type','audio/webm')
        res.setHeader('Content-Length', audioBuffer.length.toString())
        return res.status(200).send(audioBuffer)
    } catch(e){
        console.error(e)
        return res.sendStatus(500)
    }
})
app.listen(8080)