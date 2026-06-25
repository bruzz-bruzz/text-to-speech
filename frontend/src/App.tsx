import './App.css'
import {useState,useEffect} from 'react'
import axios from 'axios'
import Toast from './Toast'
import Github from './Github'
export default function App(){
  const [audio,setAudio] = useState<any>("")
  const [text,setText] = useState<string>('Hello, how are you?')
  const [toast,setToast] = useState<{msg:string,ok:boolean}>({msg:"",ok:false})
  const [language,setLanguage] = useState<string>("en")
  const [converting,setConverting] = useState<boolean>(false)
  const [downloaded,setDownloaded] = useState<boolean>(false)
  const [languageExamples,setLanguageExamples] = useState<{[key:string]:{text:string,Male:string,Female:string}}>({
  'en': {
    text: 'Hello, how are you?',
    Male: 'en-US-GuyNeural',
    Female: 'en-US-JennyNeural'
  },
  'es': {
    text: 'Hola, ¿cómo estás?',
    Male: 'es-ES-AlvaroNeural',
    Female: 'es-ES-ElviraNeural'
  },
  'zh': {
    text: '你好，你怎么样？',
    Male: 'zh-CN-YunjianNeural',
    Female: 'zh-CN-XiaoxiaoNeural'
  },
  'fr': {
    text: 'Bonjour, comment ça va?',
    Male: 'fr-FR-HenriNeural',
    Female: 'fr-FR-DeniseNeural'
  },
  'de': {
    text: 'Hallo, wie geht es dir?',
    Male: 'de-DE-KillianNeural',
    Female: 'de-DE-KatjaNeural'
  },
  'ja': {
    text: 'こんにちは、お元気ですか？',
    Male: 'ja-JP-KeitaNeural',
    Female: 'ja-JP-NanamiNeural'
  },
  'ko': {
    text: '안녕하세요, 어떻게 지내세요?',
    Male: 'ko-KR-InJoonNeural',
    Female: 'ko-KR-SunHiNeural'
  },
  'it': {
    text: 'Ciao, come stai?',
    Male: 'it-IT-DiegoNeural',
    Female: 'it-IT-ElsaNeural'
  },
  'pt': {
    text: 'Olá, como você está?',
    Male: 'pt-BR-AntonioNeural',
    Female: 'pt-BR-FranciscaNeural'
  },
  'ru': {
    text: 'Привет, как дела?',
    Male: 'ru-RU-DmitryNeural',
    Female: 'ru-RU-SvetlanaNeural'
  }
  })
  const [gender,setGender] = useState<'Male'|'Female'>("Male")
  function clearToast(){
    setTimeout(()=>{
      setToast({msg:"",ok:false})
    },3000)
  }
  async function convertToWav(){
    setConverting(true)
    try{
      const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/convert`,
      { text: text, voice:`${languageExamples[language][gender]}`},
      {responseType:"arraybuffer"}
    )
    const blob = new Blob([res.data], { type: 'audio/webm' })
    const url = URL.createObjectURL(blob)
    setAudio((audio:any) => {
      try {
        if (audio && typeof audio === 'string' && audio.startsWith('blob:')) URL.revokeObjectURL(audio)
      } catch (e) {}
      return url
    })
    setToast({msg:"TTS done.",ok:true})
    setConverting(false)
    } catch(e){setToast({msg:"An error occured.",ok:false})}
    clearToast()
  }
  useEffect(()=>{
    setLanguageExamples(languageExamples)
    convertToWav()
  },[])
    return (
      <div className='font-mono'>
      <div className='flex justify-center items-center flex-col p-4 gap-4'>
        <h1>TTS</h1>
        <div className='grid grid-cols-2 gap-4 p-2'>
          <div className='p-2'>
            <label>Language:</label>
            <select className='p-2 m-2 border border-gray-300 rounded-md p-2' value={language} onChange={(e)=>{
              setLanguage(e.target.value)
              setText(languageExamples[e.target.value].text)
              setAudio("")
              setDownloaded(false)
            }}>
                <option value='en'>English</option>
                <option value='es'>Spanish</option>
                <option value='zh'>Chinese</option>
                <option value='fr'>French</option>
                <option value='de'>German</option>
                <option value='ja'>Japanese</option>
                <option value='ko'>Korean</option>
                <option value='it'>Italian</option>
                <option value='pt'>Portuguese</option>
                <option value='ru'>Russian</option>
            </select>
          </div>
          <div className='p-2'>
            <label>Gender:</label>
            <select className='p-2 m-2 border border-gray-300 rounded-md p-2' value={gender} onChange={(e)=>{
              setGender(e.target.value as 'Male'|'Female')
              setAudio("")
              setDownloaded(false)
              }}>
              <option value='Male'>Male</option>
              <option value='Female'>Female</option>
            </select>
          </div>
        </div>
        <textarea rows={5} value={text} onChange={(e) => {
          setText(e.target.value)
          setDownloaded(false)
          setAudio("")
        }} className='border border-gray-300 rounded-md p-2 w-9/10 resize-none'></textarea>
        <p>Words: {text.split(' ').length}</p>
        <button className='p-2 bg-blue-500 text-white rounded-md' onClick={convertToWav} disabled={converting}>
          {converting ? 'Converting...' : 'Convert to speech'}
        </button>
        {converting === false && audio !== "" && (
          <div className='flex flex-col items-center gap-4 p-2 justify-center'>
          <audio controls className='w-full max-w-md mx-auto my-4 bg-slate-100 dark:bg-slate-800 rounded-full shadow-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500'>
            <source src={audio} type='audio/webm'></source>
          </audio>
          <button className='p-2 bg-blue-500 text-white rounded-md' onClick={() => setDownloaded(true)}>
            <a href={audio} download>{downloaded === false ? 'Download as .webm file' : 'Downloaded'}</a>
          </button>
          </div>
        )}
      </div>
      <div>
        {toast.msg.length > 0 && (
          <Toast msg={toast.msg} ok={toast.ok}/>
        )}
      </div>
      <Github repo="text-to-speech" />
      </div>
    )
}