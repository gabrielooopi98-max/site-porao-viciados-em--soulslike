import { supabase } from './supabase';

function criarConsultorResumo(nomeFuncao) {
    let rpcDisponivel;
    let primeiraChamada;
    let argumentosDaPrimeiraChamada;
    let erroIndisponivel;

    return async function consultarResumo(argumentos) {
        if (rpcDisponivel === false) {
            return { data: null, error: erroIndisponivel };
        }

        if (rpcDisponivel === true) {
            return supabase.rpc(nomeFuncao, argumentos);
        }

        if (!primeiraChamada) {
            argumentosDaPrimeiraChamada = argumentos;
            primeiraChamada = supabase.rpc(nomeFuncao, argumentos).then(
                (resultado) => {
                    rpcDisponivel = !resultado.error;
                    erroIndisponivel = resultado.error;
                    if (resultado.error) {
                        console.warn(`RPC ${nomeFuncao} indisponível; usando consultas individuais.`);
                    }
                    return resultado;
                },
                (error) => {
                    rpcDisponivel = false;
                    erroIndisponivel = error;
                    console.warn(`RPC ${nomeFuncao} indisponível; usando consultas individuais.`);
                    return { data: null, error };
                }
            );
        }

        const resultadoInicial = await primeiraChamada;
        const mesmaConsulta = Object.keys(argumentos).every(
            (chave) => argumentosDaPrimeiraChamada[chave] === argumentos[chave]
        );

        if (resultadoInicial.error || mesmaConsulta) {
            return resultadoInicial;
        }

        return supabase.rpc(nomeFuncao, argumentos);
    };
}

export const consultarResumoInteracoesPost = criarConsultorResumo('resumo_interacoes_post');
export const consultarResumoInteracoesBuild = criarConsultorResumo('resumo_interacoes_build');