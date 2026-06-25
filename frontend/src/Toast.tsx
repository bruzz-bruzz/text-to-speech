import './App.css'
type Data = {
    msg:string,
    ok:boolean
}
export default function Toast({msg,ok}:Data){
    return (
        <div className={`${ok === true ? 'bg-green-500' : 'bg-red-500'} p-4 rounded-lg flex justify-center items-center flex-col font-mono absolute bottom-5 right-5`}>
            <p className='text-xl'>{msg}</p>
        </div>
    )
}