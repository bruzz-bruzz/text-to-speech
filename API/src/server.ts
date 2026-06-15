import express,{Request,Response} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import text2wav from 'text2wav'
const rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10
})
const app = express()
app.set('trust proxy', 1)
app.use(rateLimiter)
app.use(cors())
app.use(helmet())
app.use(express.json())
app.post('/convert',async(req:Request,res:Response)=>{
    try {
        res.setHeader('Content-Type', 'audio/wav')
        const audioData = await text2wav(req.body.text,{voice:req.body.voice})
        return res.status(200).send(audioData)
    } catch (error) {
        console.log(error)
        res.status(500).send('Error converting text to speech')
    }
})
app.listen(8080)