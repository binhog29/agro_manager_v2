// --- ALGORITMO DE BUSCA DE CAMINHO (BFS) ---
function obterCaminho(origem, destino) {
    const rotas = window.ROTAS_FAZENDA;
    if (!rotas || !rotas[origem] || !rotas[destino]) return [];
    if (origem === destino) return [destino];

    let fila = [[origem]];
    let visitados = new Set([origem]);

    while (fila.length > 0) {
        let caminho = fila.shift();
        let noAtual = caminho[caminho.length - 1];

        if (noAtual === destino) return caminho;

        for (let vizinho of (rotas[noAtual]?.conexoes || [])) {
            if (!visitados.has(vizinho)) {
                visitados.add(vizinho);
                fila.push([...caminho, vizinho]);
            }
        }
    }
    return [];
}

class PeaoMapa {
    constructor(id, nome, noInicialId = "alojamento") {
        this.id = id;
        this.nome = nome;
        this.noAtualId = noInicialId;
        
        const rotas = window.ROTAS_FAZENDA || {};
        const noInicial = rotas[noInicialId] || { x: 86.4, y: 15.1 };
        this.posX = noInicial.x;
        this.posY = noInicial.y;

        this.isMoving = false;
        this.dormindo = false;
        this.ocupado = false; // Garante que não encavale tarefas
        this.insumoCarregado = null; // Ex: 'Sal', 'Ração'

        this.element = null;
        this.balao = null;
        this.animationFrame = null;
        this.balaoTimer = null;
        this.patrulhaTimer = null;
        
        this.noAlojamentoId = "alojamento";
        this.noArmazemId = "armazem"; // Ponto base de suprimentos
    }

    render(container) {
        if (!container) return;

        let el = document.getElementById(`peao-${this.id}`);
        if (!el) {
            el = document.createElement('div');
            el.id = `peao-${this.id}`;
            el.className = 'peao-worker';
            container.appendChild(el);
        }
        this.element = el;
        this.element.style.left = `${this.posX}%`;
        this.element.style.top = `${this.posY}%`;

        this.element.innerHTML = `
            <div id="balao-peao-${this.id}" class="balao-status-func" style="display:none;"></div>
            <div class="peao-corpo" style="position:relative; width:24px; height:32px; transform: scale(0.55); transform-origin: bottom center;">
                <div style="position:absolute; top:0; left:1px; width:22px; height:6px; background:#e0a96d; border-radius:10px; border:1px solid #8c531b; z-index:3;"></div>
                <div style="position:absolute; top:5px; left:6px; width:12px; height:10px; background:#ffdbac; border-radius:50%; z-index:2;"></div>
                <div style="position:absolute; top:14px; left:5px; width:14px; height:10px; background:#d9534f; border-radius:3px; z-index:2;"></div>
                <div class="perna esq" style="position:absolute; top:23px; left:6px; width:4px; height:8px; background:#292b2c; border-radius:2px;"></div>
                <div class="perna dir" style="position:absolute; top:23px; left:14px; width:4px; height:8px; background:#292b2c; border-radius:2px;"></div>
            </div>
        `;
        this.balao = this.element.querySelector(`#balao-peao-${this.id}`);

        this.element.onclick = (e) => {
            e.stopPropagation();
            if (this.dormindo) {
                this.falar(`${this.nome}: Zzz... (Dormindo)`, 2500);
            } else if (this.insumoCarregado) {
                this.falar(`${this.nome}: Levando ${this.insumoCarregado}!`, 2500);
            } else {
                this.falar(`${this.nome}: Pronto pro trabalho!`, 2500);
            }
        };
    }

    falar(texto, tempo = 3000) {
        if (!this.balao) return;
        this.balao.innerText = texto;
        this.balao.style.display = 'block';
        if (tempo > 0) {
            clearTimeout(this.balaoTimer);
            this.balaoTimer = setTimeout(() => {
                if (!this.dormindo) this.balao.style.display = 'none';
            }, tempo);
        }
    }

    mudarParaPosicao(targetX, targetY, callback) {
        if (!this.element) return;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        this.isMoving = true;
        this.element.classList.add('andando');

        const vel = 0.08;

        const animar = () => {
            const dx = targetX - this.posX;
            const dy = targetY - this.posY;
            const dist = Math.hypot(dx, dy);

            if (dist < vel) {
                this.posX = targetX;
                this.posY = targetY;
                this.element.style.left = `${this.posX}%`;
                this.element.style.top = `${this.posY}%`;

                this.element.classList.remove('andando');
                this.isMoving = false;
                if (callback) callback();
                return;
            }

            const corpo = this.element.querySelector('.peao-corpo');
            if (corpo && Math.abs(dx) > 0.05) {
                corpo.style.transform = dx < 0 
                    ? 'scaleX(-1) scale(0.55)' 
                    : 'scaleX(1) scale(0.55)';
            }

            this.posX += (dx / dist) * vel;
            this.posY += (dy / dist) * vel;

            this.element.style.left = `${this.posX}%`;
            this.element.style.top = `${this.posY}%`;

            this.animationFrame = requestAnimationFrame(animar);
        };

        this.animationFrame = requestAnimationFrame(animar);
    }

    seguirRota(caminhoNos, callback) {
        if (!caminhoNos || caminhoNos.length === 0) {
            if (callback) callback();
            return;
        }

        const rotas = window.ROTAS_FAZENDA || {};
        let i = 0;
        const passo = () => {
            if (i >= caminhoNos.length) {
                if (callback) callback();
                return;
            }

            const proximoNoId = caminhoNos[i];
            const dadosNo = rotas[proximoNoId];

            if (!dadosNo) {
                i++;
                passo();
                return;
            }

            this.mudarParaPosicao(dadosNo.x, dadosNo.y, () => {
                this.noAtualId = proximoNoId;
                i++;
                passo();
            });
        };

        passo();
    }

    irPara(destinoNoId, callback) {
        const caminho = obterCaminho(this.noAtualId, destinoNoId);
        if (caminho.length === 0) {
            if (callback) callback();
            return;
        }
        
        if (caminho[0] === this.noAtualId) caminho.shift();

        this.seguirRota(caminho, callback);
    }

    // --- LÓGICA DE IR E VIR (LOGÍSTICA DE INSUMOS) ---
    executarCicloTrabalho(destinoId, tipoInsumo = "Ração", callback) {
        if (this.dormindo || this.ocupado) return;
        this.ocupado = true;

        // ETAPA 1: Ir até o Armazém buscar o produto
        this.falar(`Indo ao Armazém buscar ${tipoInsumo}...`, 2500);

        this.irPara(this.noArmazemId, () => {
            if (this.dormindo) return;

            // Tempo para carregar o insumo no armazém
            this.falar(`Carregando ${tipoInsumo}... 📦`, 2000);
            this.insumoCarregado = tipoInsumo;

            setTimeout(() => {
                if (this.dormindo) return;

                // ETAPA 2: Levar o produto até o destino (ex: 'chiqueiro', 'haras')
                this.falar(`Levando ${tipoInsumo} até o ${destinoId}...`, 3000);

                this.irPara(destinoId, () => {
                    if (this.dormindo) return;

                    // Tempo de trabalho/alimentação no setor
                    this.falar(`Tratando no ${destinoId}... 🌾`, 3000);

                    setTimeout(() => {
                        if (this.dormindo) return;
                        this.insumoCarregado = null;

                        // ETAPA 3: Retornar ao Alojamento ou aguardar a próxima tarefa
                        this.falar(`Serviço pronto! Voltando ao Alojamento...`, 2500);

                        this.irPara(this.noAlojamentoId, () => {
                            this.falar(`Descansando um pouco...`, 2000);
                            this.ocupado = false;
                            if (callback) callback();
                        });
                    }, 3500); // Duração da tarefa no local
                });
            }, 2000); // Duração do carregamento no armazém
        });
    }

    // --- PATRULHA AUTOMÁTICA EM CICLOS ---
    iniciarPatrulha(listaDestinos) {
        if (this.dormindo || this.ocupado) return;

        const proximoCiclo = () => {
            if (this.dormindo || !listaDestinos || listaDestinos.length === 0) return;

            const destinoSorteado = listaDestinos[Math.floor(Math.random() * listaDestinos.length)];
            const insumos = ["Ração", "Sal Mineral"];
            const insumoSorteado = insumos[Math.floor(Math.random() * insumos.length)];

            const tempoEspera = Math.random() * 4000 + 3000;

            this.patrulhaTimer = setTimeout(() => {
                if (this.dormindo) return;
                
                this.executarCicloTrabalho(destinoSorteado, insumoSorteado, () => {
                    // Após concluir o ciclo completo, aguarda um tempo e inicia o próximo
                    proximoCiclo();
                });
            }, tempoEspera);
        };

        proximoCiclo();
    }

    setNoite(eNoite, listaDestinos = []) {
        if (eNoite) {
            this.dormindo = true;
            this.ocupado = false;
            this.insumoCarregado = null;
            clearTimeout(this.patrulhaTimer);

            this.falar(`Dia finalizado! Indo dormir...`, 3000);
            this.irPara(this.noAlojamentoId, () => {
                this.falar(`Zzz... 😴`, 0);
            });
        } else {
            if (this.dormindo) {
                this.dormindo = false;
                this.falar(`Bom dia! Hora da rotina!`, 3000);

                setTimeout(() => {
                    this.iniciarPatrulha(listaDestinos);
                }, 2000);
            }
        }
    }
}

// --- INICIALIZAÇÃO DA FAZENDA ---
document.addEventListener("DOMContentLoaded", function() {
    const containerMapa = document.getElementById("container-mapa");
    if (containerMapa && window.ROTAS_FAZENDA) {
        const tiao = new PeaoMapa(1, 'Tião', 'alojamento');
        const ze = new PeaoMapa(2, 'Zé', 'alojamento');

        tiao.render(containerMapa);
        ze.render(containerMapa);

        window.peoesAtivos = [tiao, ze];

        // Quando você criar os nós no rotas_fazenda.js, adicione as chaves aqui:
        const setoresTrabalho = [
            "curral", 
            "pasto", 
            "chiqueiro", 
            "galinheiro", 
            "aprisco", 
            "haras", 
            "represa"
        ];

        tiao.iniciarPatrulha(setoresTrabalho);
        setTimeout(() => ze.iniciarPatrulha(setoresTrabalho), 3500);
    }
});
