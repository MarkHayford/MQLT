    export const EDGE_UPLOAD_MAX = 800 * 1024 * 1024
    export const PICK_UPLOAD_MAX = 1024 * 1024 * 1024
    const evenPx = (n) => Math.max(2, Math.round(Number(n) || 0) >> 1 << 1)
    const mediaName = (file) => String((file && file.name) || "").toLowerCase()
    const mediaType = (file) => String((file && file.type) || "").toLowerCase()
    export const isVideoFile = (file) => /^video\//.test(mediaType(file)) || /\.(mp4|m4v|mov|3gp|webm|avi|mkv)$/i.test(mediaName(file))
    export const isAudioFile = (file) => /^audio\//.test(mediaType(file)) || /\.(mp3|m4a|aac|wav)$/i.test(mediaName(file))
    const isDirectPlayableVideo = (file) => mediaType(file) === "video/mp4" || /\.(mp4|m4v)$/i.test(mediaName(file))
    const recorderMime = () => {
      const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1.4D001F,mp4a.40.2", "video/mp4"]
      for (let i = 0; i < types.length; i++) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(types[i])) return types[i]
      }
      return ""
    }
    const compressVideoToMp4 = (file, onProgress) => new Promise((resolve, reject) => {
      const mime = recorderMime()
      if (!mime) {
        reject(new Error("当前浏览器无法压成小程序可播的 MP4，请用 Edge / Chrome"))
        return
      }
      const url = URL.createObjectURL(file)
      const video = document.createElement("video")
      video.muted = true
      video.playsInline = true
      video.preload = "metadata"
      video.src = url
      const fail = (msg) => {
        URL.revokeObjectURL(url)
        reject(new Error(msg || "视频无法解码，请换成 MP4"))
      }
      video.onerror = () => fail("浏览器无法解码该视频，请先转为 MP4")
      video.onloadedmetadata = () => {
        const duration = Math.max(1, Number(video.duration) || 1)
        const maxW = 1280
        const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1
        const w = evenPx(video.videoWidth * scale)
        const h = evenPx(video.videoHeight * scale)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        const srcStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null)
        const outStream = canvas.captureStream(24)
        if (srcStream) {
          const tracks = srcStream.getAudioTracks()
          for (let i = 0; i < tracks.length; i++) outStream.addTrack(tracks[i])
        }
        const targetBits = Math.floor(720 * 1024 * 1024 * 8 / duration * 0.8)
        const bitrate = Math.max(500000, Math.min(2500000, targetBits))
        let rec
        try {
          rec = new MediaRecorder(outStream, { mimeType: mime, videoBitsPerSecond: bitrate })
        } catch (err) {
          fail("无法启动压缩")
          return
        }
        const chunks = []
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
        rec.onerror = () => fail("压缩失败")
        rec.onstop = () => {
          URL.revokeObjectURL(url)
          const blob = new Blob(chunks, { type: "video/mp4" })
          resolve(new File([blob], "lecture.mp4", { type: "video/mp4" }))
        }
        const draw = () => {
          if (video.ended || video.paused) return
          ctx.drawImage(video, 0, 0, w, h)
          if (onProgress) onProgress(video.currentTime / duration, "压缩裁剪中 " + Math.min(99, Math.round(video.currentTime / duration * 100)) + "%")
          requestAnimationFrame(draw)
        }
        rec.start(1000)
        video.muted = false
        const play = video.play()
        if (play && play.then) play.then(draw).catch(() => {
          video.muted = true
          video.play().then(draw).catch(() => fail("无法播放该视频进行压缩"))
        })
        else draw()
        video.onended = () => {
          try { rec.stop() } catch (_err) {}
        }
      }
    })
    export const preparePlayableUpload = async (file, onProgress) => {
      if (!file) throw new Error("请选择文件")
      if (file.size > PICK_UPLOAD_MAX) throw new Error("请选择不超过 1GB 的文件，将自动压缩到 800MB 内再上传")
      if (isAudioFile(file)) {
        if (file.size > EDGE_UPLOAD_MAX) throw new Error("音频超过 800MB，请先剪短")
        return file
      }
      if (isVideoFile(file)) {
        if (isDirectPlayableVideo(file) && file.size <= EDGE_UPLOAD_MAX) return file
        if (onProgress) onProgress(0, "超过 EdgeOne 800MB 或非 MP4，正在压缩裁剪为 720p…")
        const out = await compressVideoToMp4(file, onProgress)
        if (out.size > EDGE_UPLOAD_MAX) throw new Error("压缩后仍超过 800MB，请再剪短或降低分辨率")
        return out
      }
      if (file.size > EDGE_UPLOAD_MAX) throw new Error("文件超过 EdgeOne 800MB 上限")
      return file
    }
