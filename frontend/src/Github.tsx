import './App.css'
type Data = {
    repo:string
}
export default function Github({repo}:Data){
    return (
        <div className='p-4 text-center text-gray-500'>
            <h1>Made by bruzz-bruzz</h1>
            <h3><a href='https://github.com/bruzz-bruzz' className='underline' target="_blank">GitHub Profile</a></h3>
            <h4><a href={`https://github.com/bruzz-bruzz/${repo}`} className='underline' target="_blank">GitHub Repository</a></h4>
        </div>
    )
}