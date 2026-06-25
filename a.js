async function a(){
    const res = await fetch('https://text-to-speech-three-ruddy.vercel.app/convert',{
        method:"POST",
        body:JSON.stringify({voice:"en-US-GuyNeural",text:" BRO"})
    })
    const data = await res.arrayBuffer()
    console.log(data)
}
a()