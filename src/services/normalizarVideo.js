let ffmpegPromise;
let atualizarProgresso = () => {};

async function obterFFmpeg() {
    if (!ffmpegPromise) {
        ffmpegPromise = (async () => {
            const [{ FFmpeg }, { fetchFile }, coreAsset, wasmAsset] = await Promise.all([
                import('@ffmpeg/ffmpeg'),
                import('@ffmpeg/util'),
                import('@ffmpeg/core?url'),
                import('@ffmpeg/core/wasm?url'),
            ]);
            const ffmpeg = new FFmpeg();

            ffmpeg.on('progress', ({ progress }) => {
                atualizarProgresso({
                    etapa: 'convertendo',
                    progresso: Math.round(Math.max(0, Math.min(1, progress)) * 100),
                });
            });

            await ffmpeg.load({
                coreURL: coreAsset.default,
                wasmURL: wasmAsset.default,
            });

            return { ffmpeg, fetchFile };
        })().catch((error) => {
            ffmpegPromise = null;
            throw error;
        });
    }

    return ffmpegPromise;
}

export async function normalizarVideo(file, aoAtualizarProgresso = () => {}) {
    if (!file?.type.startsWith('video/')) {
        return file;
    }

    atualizarProgresso = aoAtualizarProgresso;
    atualizarProgresso({ etapa: 'carregando', progresso: 0 });

    const { ffmpeg, fetchFile } = await obterFFmpeg();
    const extensaoOriginal = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    const arquivoEntrada = `entrada.${extensaoOriginal || 'video'}`;
    const arquivoSaida = 'saida.mp4';

    try {
        await ffmpeg.writeFile(arquivoEntrada, await fetchFile(file));
        const codigoSaida = await ffmpeg.exec([
            '-i', arquivoEntrada,
            '-map', '0:v:0',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '24',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
            '-movflags', '+faststart',
            '-y', arquivoSaida,
        ]);

        if (codigoSaida !== 0) {
            throw new Error('O FFmpeg não conseguiu converter este vídeo.');
        }

        const dados = await ffmpeg.readFile(arquivoSaida);
        const nomeSaida = `${file.name.replace(/\.[^.]+$/, '') || 'video'}.mp4`;

        return new File([dados.buffer], nomeSaida, {
            type: 'video/mp4',
            lastModified: Date.now(),
        });
    } finally {
        await Promise.all([
            ffmpeg.deleteFile(arquivoEntrada).catch(() => {}),
            ffmpeg.deleteFile(arquivoSaida).catch(() => {}),
        ]);
        atualizarProgresso = () => {};
    }
}
