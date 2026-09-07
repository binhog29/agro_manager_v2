// CONTROLE DE ATUALIZAÇÕES DO JOGO
const VERSAO_ATUAL = "1.2"; 

document.addEventListener('DOMContentLoaded', function() {
    
    // Injeta estilo CSS para a animação da rodovia
    const estiloAnimacao = document.createElement('style');
    estiloAnimacao.innerHTML = `
        @keyframes dashAnim { to { stroke-dashoffset: -20; } }
        .rota-tracejada-animada { animation: dashAnim 0.8s linear infinite; }
    `;
    document.head.appendChild(estiloAnimacao);

    if (localStorage.getItem('versao_agro_manager') !== VERSAO_ATUAL) {
        setTimeout(() => {
            showSweet(
                "🚀 Atualização " + VERSAO_ATUAL,
                `<div style="text-align: left; font-size: 14px; line-height: 1.6; color: #444;">
                    <b style="color: #111;">Novidades do Jogo:</b><br><br>
                    🚚 <b style="color: #2e7d32;">Logística Viva:</b> O transporte de animais agora é feito em tempo real pelo mapa global!<br><br>
                    🌱 <b style="color: #2e7d32;">Lavoura Orgânica:</b> As plantas crescem de forma orgânica e realista, abandonando o formato de "Bolinhas".<br><br>
                    🐓 <b style="color: #2e7d32;">Visuais 2D:</b> Todos os Habitats ganharam animações e itens.
                </div>`,
                `<button class="sweet-btn" style="background: #2e7d32; color: white;" onclick="fecharAvisoAtualizacao()">Continuar Jogando</button>`
            );
        }, 1000);
    }

    window.fecharAvisoAtualizacao = function() {
        localStorage.setItem('versao_agro_manager', VERSAO_ATUAL);
        closeModal();
    }

    // 1. Configuração do Mapa Leaflet
    const imageHeight = 1920; 
    const imageWidth = 1080; 
    const mapBounds = [[0, 0], [imageHeight, imageWidth]];
    
    var map = L.map('map', { 
        crs: L.CRS.Simple, minZoom: -2, maxZoom: 2, 
        zoomControl: false, attributionControl: false 
    });
    
    L.imageOverlay('/static/img/mapa_real.png', mapBounds).addTo(map);
    map.fitBounds(mapBounds);

    // 2. Alerta Autodestruir
    setTimeout(() => {
        const alertas = document.querySelectorAll('.alerta-autodestruir');
        alertas.forEach(a => { a.style.opacity = "0"; setTimeout(() => a.remove(), 500); });
    }, 3000);

    // 3. Funções de Modais
    window.fecharModalTempo = function() { document.getElementById('modal-tempo').style.display = 'none'; }
    window.closeModal = function() { document.getElementById('sweet-modal').style.display = 'none'; }

    function showSweet(title, text, actionsHtml) {
        document.getElementById('sw-title').innerText = title;
        document.getElementById('sw-text').innerHTML = text;
        document.getElementById('sw-actions').innerHTML = actionsHtml;
        document.getElementById('sweet-modal').style.display = 'flex';
    }

    function abrirModalCompra(f) {
        showSweet(f.tipo, `Preço: R$ ${f.preco.toLocaleString('pt-BR')}`, `<button class="sweet-btn" onclick="comprar(${f.id})">COMPRAR</button>`);
    }

    function abrirModalDono(f) {
        showSweet(
            f.nome, "Esta propriedade é sua.", 
            `<button class="sweet-btn" onclick="window.location.href='/fazenda/${f.id}'">ENTRAR NA FAZENDA</button>
             <button class="sweet-btn sweet-btn-sec" style="margin-top: 8px;" onclick="renomear(${f.id})">RENOMEAR</button>
             <button class="sweet-btn" style="background: #e65100; color: white; margin-top: 8px; width: 100%; border: 1px solid #bf360c;" onclick="anunciarImovel(${f.id}, '${f.nome}')"><i class="fas fa-sign"></i> VENDER NA CORRETORA</button>`
        );
    }

    window.anunciarImovel = function(fazendaId, nome) {
        window.closeModal();
        Swal.fire({
            title: 'Vender de Porteira Fechada',
            text: `Por qual valor você deseja anunciar a fazenda "${nome}"?`,
            input: 'number', inputAttributes: { min: 1 }, showCancelButton: true, confirmButtonText: 'Anunciar', cancelButtonText: 'Cancelar',
            background: '#2a2a2a', color: '#fff', confirmButtonColor: '#e65100'
        }).then((res) => {
            if(res.isConfirmed && res.value > 0) {
                fetch('/api/imobiliaria/anunciar', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fazenda_id: fazendaId, valor: parseFloat(res.value) })
                }).then(r => r.json()).then(d => {
                    if(d.sucesso) Swal.fire('No Ar!', d.msg, 'success').then(() => location.reload());
                    else Swal.fire('Erro', d.erro, 'error');
                });
            }
        });
    }

    window.comprar = function(id) { fetch(`/api/comprar_fazenda/${id}`, {method:'POST'}).then(r => r.json()).then(d => { if(d.sucesso) location.reload(); else alert(d.erro); }); }
    window.renomear = function(id) {
        showSweet("Renomear Fazenda", 
            `<p style="margin-bottom: 10px; font-size: 13px; color: #666;">Digite o novo nome da propriedade:</p><input type="text" id="input-novo-nome" placeholder="Novo nome..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; outline: none;">`, 
            `<button class="sweet-btn" style="background: #2e7d32; color: white;" onclick="confirmarRenomear(${id})">SALVAR</button><button class="sweet-btn sweet-btn-sec" onclick="closeModal()">CANCELAR</button>`
        );
    }
    window.confirmarRenomear = function(id) {
        let inputEl = document.getElementById('input-novo-nome');
        if(inputEl && inputEl.value.trim() !== "") {
            fetch(`/api/renomear/fazenda/${id}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({nome: inputEl.value.trim()}) }).then(() => location.reload());
        }
    }

    // 4. Pinos das Propriedades
    function createCustomIcon(f) {
        let icon = 'fa-map-marker-alt'; let colorClass = 'c-livre'; let mainLabel = f.nome; let subLabel = `R$ ${f.preco.toLocaleString('pt-BR')}`;
        if (f.dono_id) {
            subLabel = `<span style="color:#ffb300;">Dono:</span> ${f.dono_nome}`;
            if (f.tipo.includes('Chácara')) { icon='fa-home'; colorClass='c-chacara'; } else if (f.tipo.includes('Sítio')) { icon='fa-warehouse'; colorClass='c-sitio'; } else { icon='fa-industry'; colorClass='c-fazenda'; }
        }
        if (f.e_minha) { colorClass = 'c-meu'; subLabel="VOCÊ"; icon = 'fa-star'; }
        
        const html = `<div class="pin-wrapper"><i class="fas ${icon} pin-marker ${colorClass}"></i><div class="pin-label">${mainLabel}<span class="lbl-sub">${subLabel}</span></div></div>`;
        return L.divIcon({ html: html, className: 'custom-pin-icon', iconSize: [60, 80], iconAnchor: [30, 70] });
    }

    let layerAncoras = L.layerGroup().addTo(map);
    let layerPropriedades = L.layerGroup().addTo(map);
    let todasAsTerras = [];

    const CIDADES = [
        { nome: 'Mutum Paraná', lat: 1812, lng: 166 }, { nome: 'Rio Madeira', lat: 1827, lng: 299 }, { nome: 'Jirau', lat: 1785, lng: 448 },
        { nome: 'Jaci Paraná', lat: 1761, lng: 641 }, { nome: 'Porto Velho', lat: 1676, lng: 964 }, { nome: 'São Domingos', lat: 1397, lng: 132 },
        { nome: 'Itapuã do Oeste', lat: 1347, lng: 855 }, { nome: 'Bom Futuro', lat: 1296, lng: 525 }, { nome: 'Buritis', lat: 1265, lng: 287 },
        { nome: 'Alto Paraíso', lat: 1220, lng: 634 }, { nome: 'Campo Novo', lat: 1058, lng: 192 }, { nome: 'Monte Negro', lat: 1052, lng: 430 },
        { nome: 'Ariquemes', lat: 1069, lng: 635 }, { nome: 'Rio Crespo', lat: 1080, lng: 849 }, { nome: 'Cujubim', lat: 1072, lng: 990 },
        { nome: 'Machadinho', lat: 721, lng: 1020 }, { nome: 'Jaru', lat: 699, lng: 620 }, { nome: 'São Miguel', lat: 387, lng: 76 },
        { nome: 'Alvorada', lat: 351, lng: 342 }, { nome: 'Ouro Preto', lat: 371, lng: 613 }, { nome: 'Nova Brasilândia', lat: 258, lng: 242 },
        { nome: 'Castanheiras', lat: 192, lng: 428 }, { nome: 'Santa Luzia', lat: 224, lng: 1013 }, { nome: 'Cacoal', lat: 192, lng: 1059 },
        { nome: 'Alta Floresta', lat: 64, lng: 227 }, { nome: 'Rolim de Moura', lat: 42, lng: 345 }, { nome: 'Ji-Paraná', lat: 22, lng: 564 }
    ];

        fetch('/api/mapa_global')
        .then(r => r.json())
        .then(data => {
            todasAsTerras = data;
            
            let cidadeSalvaNome = localStorage.getItem('cidade_aberta_agro');
            if (cidadeSalvaNome) {
                let cidadeSalva = CIDADES.find(c => c.nome === cidadeSalvaNome);
                if (cidadeSalva) {
                    let terrasDaCidade = todasAsTerras.filter(f => f.cidade === cidadeSalva.nome);
                    darZoomNaRegiao(cidadeSalva, terrasDaCidade, true); 
                } else renderizarAncoras();
            } else renderizarAncoras();

            // 🔥 NOVO: CARREGA A FROTA EM TRÂNSITO NO MAPA
            fetch('/api/mapa_frota')
            .then(r => r.json())
            .then(frota => {
                // Injeta CSS da rodovia animada se houver caminhões
                if (frota.length > 0 && !document.getElementById('css-rodovia')) {
                    const style = document.createElement('style');
                    style.id = 'css-rodovia';
                    style.innerHTML = `@keyframes trac { to { stroke-dashoffset: -20; } } .rota-animada { animation: trac 1s linear infinite; }`;
                    document.head.appendChild(style);
                }

                frota.forEach(viagem => {
                    const terraOrigem = todasAsTerras.find(t => t.id === viagem.origem_id);
                    const terraDestino = todasAsTerras.find(t => t.id === viagem.destino_id);
                    
                    if(terraOrigem && terraDestino) {
                        const cidOrigem = CIDADES.find(c => c.nome === terraOrigem.cidade);
                        const cidDestino = CIDADES.find(c => c.nome === terraDestino.cidade);
                        
                        if(cidOrigem && cidDestino) {
                            let ptO = [cidOrigem.lat, cidOrigem.lng];
                            let ptD = [cidDestino.lat, cidDestino.lng];
                            
                            // Se transferiu dentro da mesma cidade, puxa os pontos um pouco para o lado pra ver a reta
                            if (cidOrigem.nome === cidDestino.nome) {
                                ptO = [cidOrigem.lat - 20, cidOrigem.lng - 20];
                                ptD = [cidDestino.lat + 20, cidDestino.lng + 20];
                            }
                            
                            // Desenha a Rodovia Animada
                            L.polyline([ptO, ptD], {color: '#ff9800', weight: 4, dashArray: '10, 10', className: 'rota-animada'}).addTo(map);
                            
                            // Acha o meio do caminho para estacionar o ícone do Caminhão
                            let midLat = (ptO[0] + ptD[0]) / 2;
                            let midLng = (ptO[1] + ptD[1]) / 2;
                            let virarX = ptD[1] > ptO[1] ? 'scaleX(-1)' : 'scaleX(1)';
                            
                            let truckHtml = `
                                <div style="font-size:30px; filter: drop-shadow(2px 5px 5px rgba(0,0,0,0.8)); transform: ${virarX};">🚚</div>
                                <div style="background:#222; border: 1px solid #ff9800; color:#fff; font-size:10px; padding:2px 5px; border-radius:4px; white-space:nowrap; position:absolute; top:-15px; left:-20px; box-shadow: 0 4px 6px rgba(0,0,0,0.6);">
                                    ${viagem.qtd} Cab. (Faltam ${viagem.horas_restantes}h)
                                </div>
                            `;
                            L.marker([midLat, midLng], {icon: L.divIcon({html: truckHtml, className: '', iconSize:[40,40]})}).addTo(map);
                        }
                    }
                });
            });
        }).catch(erro => console.error(erro));
    
    fetch('/api/mapa_global')
        .then(r => r.json())
        .then(data => {
            todasAsTerras = data;
            
            // Fluxo Normal do Mapa
            let cidadeSalvaNome = localStorage.getItem('cidade_aberta_agro');
            if (cidadeSalvaNome) {
                let cidadeSalva = CIDADES.find(c => c.nome === cidadeSalvaNome);
                if (cidadeSalva) {
                    let terrasDaCidade = todasAsTerras.filter(f => f.cidade === cidadeSalva.nome);
                    darZoomNaRegiao(cidadeSalva, terrasDaCidade, true); 
                } else renderizarAncoras();
            } else renderizarAncoras();
            
            // 🔥 NOVO: BOTÃO FLUTUANTE DA FROTA EM TRÂNSITO
            fetch('/api/mapa_frota')
            .then(r => r.json())
            .then(frota => {
                if (frota.length > 0) {
                    // Cria o botão de Logística no canto inferior esquerdo
                    let btnFrota = document.getElementById('btn-frota-ativa');
                    if (!btnFrota) {
                        btnFrota = document.createElement('div');
                        btnFrota.id = 'btn-frota-ativa';
                        btnFrota.style.cssText = `
                            position: fixed; bottom: 85px; left: 20px; 
                            background: #e65100; color: white; border-radius: 8px; 
                            padding: 10px 15px; display: flex; align-items: center; gap: 10px; 
                            box-shadow: 0 4px 8px rgba(0,0,0,0.6); z-index: 1000; cursor: pointer;
                            border: 2px solid #ffb300; font-weight: bold; font-size: 13px;
                            transition: transform 0.2s;
                        `;
                        // Efeito de hover
                        btnFrota.onmouseover = () => btnFrota.style.transform = 'scale(1.05)';
                        btnFrota.onmouseout = () => btnFrota.style.transform = 'scale(1)';
                        document.body.appendChild(btnFrota);
                    }
                    
                    btnFrota.innerHTML = `<i class="fas fa-truck-moving" style="font-size: 18px;"></i> <span>${frota.length} Transporte(s)</span>`;
                    
                    // Ação ao clicar no botão: Abre o relatório de viagens
                    btnFrota.onclick = () => {
                        let htmlList = '<div style="text-align: left; max-height: 45vh; overflow-y: auto; padding-right: 5px;">';
                        frota.forEach(viagem => {
                            let orig = todasAsTerras.find(t => t.id === viagem.origem_id);
                            let dest = todasAsTerras.find(t => t.id === viagem.destino_id);
                            let nomeO = orig ? orig.nome : "Origem Desconhecida";
                            let nomeD = dest ? dest.nome : "Destino Desconhecido";
                            
                            htmlList += `
                            <div style="background: #222; border-left: 4px solid #ff9800; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-right: 1px solid #333; border-top: 1px solid #333; border-bottom: 1px solid #333;">
                                <div style="color: #fff; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                                    <i class="fas fa-truck"></i> Carga: ${viagem.qtd} cabeças
                                </div>
                                <div style="font-size: 12px; color: #aaa; margin-bottom: 2px;"><b>De:</b> ${nomeO}</div>
                                <div style="font-size: 12px; color: #aaa;"><b>Para:</b> ${nomeD}</div>
                                <div style="margin-top: 8px; font-size: 12px; color: #4caf50; background: #111; padding: 5px; border-radius: 4px; text-align: center; font-weight: bold;">
                                    <i class="fas fa-clock"></i> Chega em ${viagem.horas_restantes} horas do jogo
                                </div>
                            </div>
                            `;
                        });
                        htmlList += '</div>';
                        
                        Swal.fire({
                            title: '🚛 Logística em Andamento',
                            html: htmlList,
                            background: '#1a1a1a', color: '#fff',
                            showConfirmButton: true, confirmButtonText: 'Fechar', confirmButtonColor: '#555'
                        });
                    };
                } else {
                    // Se não tiver caminhões na rua, o botão some automaticamente
                    let btnFrota = document.getElementById('btn-frota-ativa');
                    if (btnFrota) btnFrota.remove();
                }
            });
        }).catch(erro => console.error(erro));

    // ==========================================
    // 🚚 O MOTOR DA ANIMAÇÃO DO CAMINHÃO 
    // ==========================================
    function iniciarAnimacaoViagem(origemId, destinoId, msgFinal) {
        renderizarAncoras(); 
        document.getElementById('painel-cidade-topo').style.display = 'none';

        const terraOrigem = todasAsTerras.find(t => t.id === origemId);
        const terraDestino = todasAsTerras.find(t => t.id === destinoId);

        if (!terraOrigem || !terraDestino) {
            Swal.fire('Chegou! 🚚', msgFinal, 'success');
            return;
        }

        const cidOrigem = CIDADES.find(c => c.nome === terraOrigem.cidade);
        const cidDestino = CIDADES.find(c => c.nome === terraDestino.cidade);

        if (!cidOrigem || !cidDestino) return;

        let ptOrigem = [cidOrigem.lat, cidOrigem.lng];
        let ptDestino = [cidDestino.lat, cidDestino.lng];

        // Se transferiu dentro da mesma cidade, cria uma rotazinha falsa na volta do quarteirão
        if (cidOrigem.nome === cidDestino.nome) {
            ptDestino = [cidDestino.lat + 40, cidDestino.lng + 40];
        }

        // Foca a câmera abrangendo as duas cidades
        map.flyToBounds([ptOrigem, ptDestino], { padding: [100, 100], duration: 1.5 });

        // Espera o Zoom da câmera terminar
        setTimeout(() => {
            // Desenha a Rodovia animada
            const rota = L.polyline([ptOrigem, ptDestino], {
                color: '#ff9800', weight: 4, dashArray: '10, 10', className: 'rota-tracejada-animada'
            }).addTo(map);

            // Descobre pra qual lado o caminhão deve virar o rosto (o caminhão 🚛 olha pra esquerda)
            const movendoParaDireita = ptDestino[1] > ptOrigem[1];
            const virarEixoX = movendoParaDireita ? 'scaleX(-1)' : 'scaleX(1)';

            const caminhaoIcon = L.divIcon({
                html: `<div style="font-size:35px; filter: drop-shadow(2px 5px 5px rgba(0,0,0,0.8)); transform: ${virarEixoX};">🚛</div>`,
                className: '', iconSize: [40, 40], iconAnchor: [20, 20]
            });

            const caminhaoMarker = L.marker(ptOrigem, {icon: caminhaoIcon}).addTo(map);

            // Matemática da Velocidade
            const dx = ptDestino[0] - ptOrigem[0];
            const dy = ptDestino[1] - ptOrigem[1];
            const distancia = Math.sqrt(dx*dx + dy*dy);
            
            // O caminhão viaja a 200 pixels por segundo. Duração Mínima: 3s. Máxima: 8s.
            let tempoDeViagemS = Math.min(8, Math.max(3, distancia / 200)); 
            const duracaoMs = tempoDeViagemS * 1000;
            const startTime = performance.now();

            function animarCaminhao(currentTime) {
                let tempoDecorrido = currentTime - startTime;
                let progresso = tempoDecorrido / duracaoMs;

                if (progresso >= 1) {
                    caminhaoMarker.setLatLng(ptDestino);
                    
                    setTimeout(() => {
                        map.removeLayer(caminhaoMarker);
                        map.removeLayer(rota);
                        
                        Swal.fire({
                            title: 'Carga Entregue! 📍', text: msgFinal, icon: 'success',
                            background: '#2a2a2a', color: '#fff', confirmButtonColor: '#2e7d32'
                        }).then(() => {
                            // Entra na cidade de destino para o jogador ver seus novos animais
                            let terrasDestino = todasAsTerras.filter(f => f.cidade === cidDestino.nome);
                            darZoomNaRegiao(cidDestino, terrasDestino);
                        });
                    }, 500); // Pausa de 0.5s pra o jogador ver o caminhão parado no destino
                    return;
                }

                let latAtual = ptOrigem[0] + (dx * progresso);
                let lngAtual = ptOrigem[1] + (dy * progresso);
                caminhaoMarker.setLatLng([latAtual, lngAtual]);

                requestAnimationFrame(animarCaminhao);
            }

            requestAnimationFrame(animarCaminhao);

        }, 1600); 
    }
    // ==========================================

    function renderizarAncoras() {
        layerPropriedades.clearLayers(); layerAncoras.clearLayers();      

        CIDADES.forEach(cidade => {
            let terrasDaCidade = todasAsTerras.filter(f => f.cidade === cidade.nome);
            if(terrasDaCidade.length > 0) {
                let iconHtml = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                        <div style="background: rgba(20,20,20,0.95); border: 1px solid #fff; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                            ${cidade.nome}
                        </div>
                        <i class="fas fa-map-marker-alt" style="color: #fff; font-size: 34px; text-shadow: 0px 4px 10px rgba(0,0,0,0.8);"></i>
                    </div>`;
                let cityIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [120, 70], iconAnchor: [60, 68] });
                L.marker([cidade.lat, cidade.lng], {icon: cityIcon}).addTo(layerAncoras).on('click', () => darZoomNaRegiao(cidade, terrasDaCidade));
            }
        });
    }

    function darZoomNaRegiao(cidade, terras, rapido = false) {
        layerAncoras.clearLayers(); layerPropriedades.clearLayers();
        localStorage.setItem('cidade_aberta_agro', cidade.nome);
        document.getElementById('nome-cidade-atual').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${cidade.nome}`;
        document.getElementById('painel-cidade-topo').style.display = 'flex';

        map.flyTo([cidade.lat, cidade.lng], 1, { duration: rapido ? 0 : 1.5 });

        setTimeout(() => {
            let colunas = 4; let espacoEntrePinos = 85; 
            let linhas = Math.ceil(terras.length / colunas);
            let larguraTotal = colunas * espacoEntrePinos;
            let alturaTotal = linhas * espacoEntrePinos;

            let inicioLat = cidade.lat + (alturaTotal / 2); 
            let inicioLng = cidade.lng - (larguraTotal / 2);

            let margem = 80;
            if (inicioLng < margem) inicioLng = margem; 
            else if (inicioLng + larguraTotal > 1080 - margem) inicioLng = 1080 - larguraTotal - margem; 
            if (inicioLat > 1920 - margem) inicioLat = 1920 - margem; 
            else if (inicioLat - alturaTotal < margem) inicioLat = alturaTotal + margem; 

            terras.forEach((f, index) => {
                let linha = Math.floor(index / colunas);
                let coluna = index % colunas;
                let offsetZigueZague = (linha % 2 === 0) ? 0 : (espacoEntrePinos / 2);
                let posX = inicioLng + (coluna * espacoEntrePinos) + offsetZigueZague;
                let posY = inicioLat - (linha * espacoEntrePinos);

                L.marker([posY, posX], {icon: createCustomIcon(f)}).addTo(layerPropriedades)
                 .on('click', () => {
                     if(!f.dono_id) abrirModalCompra(f);
                     else if(f.e_minha) abrirModalDono(f);
                     else {
                         showSweet(f.nome, `<div style="color:#aaa; margin-bottom: 15px;">Propriedade de <b style="color:#ffb300;">${f.dono_nome}</b></div>`, `<button class="sweet-btn" style="background: #0288d1; color: white; margin-top: 10px;" onclick="window.location.href='/fazenda/${f.id}'"><i class="fas fa-eye"></i> VISITAR FAZENDA</button>`); 
                     }
                 });
            });
        }, rapido ? 50 : 1200); 
    }

    window.voltarMapaGlobal = function() {
        localStorage.removeItem('cidade_aberta_agro');
        document.getElementById('painel-cidade-topo').style.display = 'none';
        layerPropriedades.clearLayers(); 
        renderizarAncoras();             
        map.flyToBounds(mapBounds, { duration: 1.5 });
    }
});
