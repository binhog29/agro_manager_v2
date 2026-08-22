// CONTROLE DE ATUALIZAÇÕES DO JOGO
const VERSAO_ATUAL = "1.1"; 

document.addEventListener('DOMContentLoaded', function() {
    
    // SISTEMA DE AVISO DE PATCH NOTES
    if (localStorage.getItem('versao_agro_manager') !== VERSAO_ATUAL) {
        setTimeout(() => {
            showSweet(
                "🚀 Atualização " + VERSAO_ATUAL,
                `<div style="text-align: left; font-size: 14px; line-height: 1.6; color: #444;">
                    <b style="color: #111;">Novidades do Jogo:</b><br><br>
                    📦 <b style="color: #2e7d32;">Limites Reais:</b> O Silo e o Armazém agora respeitam suas capacidades máximas. Controle seu estoque!<br><br>
                    🗺️ <b style="color: #2e7d32;">Mundo Vivo:</b> O nome dos fazendeiros agora aparece no mapa global nas terras compradas.<br><br>
                    🌱 <b style="color: #2e7d32;">Biologia 2.0:</b> Novo sistema de envelhecimento de plantas (Cacau, Banana) e Sazonalidade (Café).
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
        crs: L.CRS.Simple, 
        minZoom: -2, 
        maxZoom: 2, 
        zoomControl: false, 
        attributionControl: false 
    });
    
    L.imageOverlay('/static/img/mapa_real.png', mapBounds).addTo(map);
    map.fitBounds(mapBounds);

    // 2. Alerta Autodestruir
    setTimeout(() => {
        const alertas = document.querySelectorAll('.alerta-autodestruir');
        alertas.forEach(a => { 
            a.style.opacity = "0"; 
            setTimeout(() => a.remove(), 500); 
        });
    }, 3000);

    // 3. Funções do Modal Customizado (Integrado ao seu HTML)
    window.fecharModalTempo = function() {
        document.getElementById('modal-tempo').style.display = 'none';
    }

    window.closeModal = function() { 
        document.getElementById('sweet-modal').style.display = 'none'; 
    }

    function showSweet(title, text, actionsHtml) {
        document.getElementById('sw-title').innerText = title;
        document.getElementById('sw-text').innerHTML = text;
        document.getElementById('sw-actions').innerHTML = actionsHtml;
        document.getElementById('sweet-modal').style.display = 'flex';
    }

    function abrirModalCompra(f) {
        showSweet(
            f.tipo, 
            `Preço: R$ ${f.preco.toLocaleString('pt-BR')}`, 
            `<button class="sweet-btn" onclick="comprar(${f.id})">COMPRAR</button>`
        );
    }

    function abrirModalDono(f) {
        showSweet(
            f.nome, 
            "Esta propriedade é sua.", 
            `<button class="sweet-btn" onclick="window.location.href='/fazenda/${f.id}'">ENTRAR</button>
             <button class="sweet-btn sweet-btn-sec" onclick="renomear(${f.id})">RENOMEAR</button>`
        );
    }

    window.comprar = function(id) {
        fetch(`/api/comprar_fazenda/${id}`, {method:'POST'})
        .then(r => r.json())
        .then(d => {
            if(d.sucesso) { location.reload(); } else { alert(d.erro); }
        });
    }

    window.renomear = function(id) {
        const inputHtml = `
            <p style="margin-bottom: 10px; font-size: 13px; color: #666;">Digite o novo nome da propriedade:</p>
            <input type="text" id="input-novo-nome" placeholder="Novo nome..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; outline: none; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
        `;
        
        const btnHtml = `
            <button class="sweet-btn" style="background: #2e7d32; color: white;" onclick="confirmarRenomear(${id})">SALVAR</button>
            <button class="sweet-btn sweet-btn-sec" onclick="closeModal()">CANCELAR</button>
        `;
        
        showSweet("Renomear Fazenda", inputHtml, btnHtml);
    }

    window.confirmarRenomear = function(id) {
        let inputEl = document.getElementById('input-novo-nome');
        if(inputEl) {
            let novo = inputEl.value;
            if(novo && novo.trim() !== "") {
                fetch(`/api/renomear/fazenda/${id}`, {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({nome: novo.trim()})
                }).then(() => location.reload());
            }
        }
    }

    // 4. Pinos das Propriedades
    function createCustomIcon(f) {
        let icon = 'fa-map-marker-alt'; 
        let colorClass = 'c-livre';
        let mainLabel = f.nome; 
        let subLabel = `R$ ${f.preco.toLocaleString('pt-BR')}`;
        
        if (f.dono_id) {
            subLabel = `<span style="color:#ffb300;">Dono:</span> ${f.dono_nome}`;
            if (f.tipo.includes('Chácara')) { icon='fa-home'; colorClass='c-chacara'; }
            else if (f.tipo.includes('Sítio')) { icon='fa-warehouse'; colorClass='c-sitio'; }
            else { icon='fa-industry'; colorClass='c-fazenda'; }
        }
        
        if (f.e_minha) { 
            colorClass = 'c-meu'; 
            subLabel="VOCÊ"; 
            icon = 'fa-star'; 
        }
        
        const html = `<div class="pin-wrapper"><i class="fas ${icon} pin-marker ${colorClass}"></i><div class="pin-label">${mainLabel}<span class="lbl-sub">${subLabel}</span></div></div>`;
        return L.divIcon({ html: html, className: 'custom-pin-icon', iconSize: [60, 80], iconAnchor: [30, 70] });
    }

    // 5. O MOTOR DE ZOOM DINÂMICO
    let layerAncoras = L.layerGroup().addTo(map);
    let layerPropriedades = L.layerGroup().addTo(map);
    let todasAsTerras = [];

    const CIDADES = [
        { nome: 'Mutum Paraná', lat: 1812, lng: 166, keywords: ['Mutum Paraná'] },
        { nome: 'Rio Madeira', lat: 1827, lng: 299, keywords: ['Rio Madeira'] },
        { nome: 'Jirau', lat: 1785, lng: 448, keywords: ['Jirau'] },
        { nome: 'Jaci Paraná', lat: 1761, lng: 641, keywords: ['Jaci Paraná'] },
        { nome: 'Porto Velho', lat: 1676, lng: 964, keywords: ['Porto Velho'] },
        { nome: 'São Domingos', lat: 1397, lng: 132, keywords: ['São Domingos'] },
        { nome: 'Itapuã do Oeste', lat: 1347, lng: 855, keywords: ['Itapuã do Oeste'] },
        { nome: 'Bom Futuro', lat: 1296, lng: 525, keywords: ['Bom Futuro'] }, 
        { nome: 'Buritis', lat: 1265, lng: 287, keywords: ['Buritis'] },
        { nome: 'Alto Paraíso', lat: 1220, lng: 634, keywords: ['Alto Paraíso'] }, 
        { nome: 'Campo Novo', lat: 1058, lng: 192, keywords: ['Campo Novo'] },
        { nome: 'Monte Negro', lat: 1052, lng: 430, keywords: ['Monte Negro'] },
        { nome: 'Ariquemes', lat: 1069, lng: 635, keywords: ['Ariquemes'] },
        { nome: 'Rio Crespo', lat: 1080, lng: 849, keywords: ['Rio Crespo'] }, 
        { nome: 'Cujubim', lat: 1072, lng: 990, keywords: ['Cujubim'] }, 
        { nome: 'Machadinho', lat: 721, lng: 1020, keywords: ['Machadinho'] }, 
        { nome: 'Jaru', lat: 699, lng: 620, keywords: ['Jaru'] },
        { nome: 'São Miguel', lat: 387, lng: 76, keywords: ['São Miguel'] },
        { nome: 'Alvorada', lat: 351, lng: 342, keywords: ['Alvorada'] },
        { nome: 'Ouro Preto', lat: 371, lng: 613, keywords: ['Ouro Preto'] }, 
        { nome: 'Nova Brasilândia', lat: 258, lng: 242, keywords: ['Nova Brasilândia'] },
        { nome: 'Castanheiras', lat: 192, lng: 428, keywords: ['Castanheiras'] },
        { nome: 'Santa Luzia', lat: 224, lng: 1013, keywords: ['Santa Luzia'] }, 
        { nome: 'Cacoal', lat: 192, lng: 1059, keywords: ['Cacoal'] }, 
        { nome: 'Alta Floresta', lat: 64, lng: 227, keywords: ['Alta Floresta'] },
        { nome: 'Rolim de Moura', lat: 42, lng: 345, keywords: ['Rolim de Moura'] },
        { nome: 'Ji-Paraná', lat: 22, lng: 564, keywords: ['Ji-Paraná'] }
    ];

    fetch('/api/mapa_global')
        .then(r => r.json())
        .then(data => {
            todasAsTerras = data;
            
            let cidadeSalvaNome = localStorage.getItem('cidade_aberta_agro');
            if (cidadeSalvaNome) {
                let cidadeSalva = CIDADES.find(c => c.nome === cidadeSalvaNome);
                if (cidadeSalva) {
                    let terrasDaCidade = todasAsTerras.filter(f => cidadeSalva.keywords.some(k => f.nome.includes(k)));
                    darZoomNaRegiao(cidadeSalva, terrasDaCidade, true); 
                } else {
                    renderizarAncoras();
                }
            } else {
                renderizarAncoras();
            }
        })
        .catch(erro => console.error("Erro na API de mapa:", erro));

    function renderizarAncoras() {
        layerPropriedades.clearLayers(); 
        layerAncoras.clearLayers();      

        CIDADES.forEach(cidade => {
            let terrasDaCidade = todasAsTerras.filter(f => cidade.keywords.some(k => f.nome.includes(k)));
            
            if(terrasDaCidade.length > 0) {
                let iconHtml = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                        <div style="background: rgba(20,20,20,0.95); border: 1px solid #fff; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                            ${cidade.nome}
                        </div>
                        <i class="fas fa-map-marker-alt" style="color: #fff; font-size: 34px; text-shadow: 0px 4px 10px rgba(0,0,0,0.8);"></i>
                    </div>`;
                    
                let cityIcon = L.divIcon({ 
                    html: iconHtml, 
                    className: '', 
                    iconSize: [120, 70], 
                    iconAnchor: [60, 68] 
                });
                
                L.marker([cidade.lat, cidade.lng], {icon: cityIcon})
                 .addTo(layerAncoras)
                 .on('click', () => darZoomNaRegiao(cidade, terrasDaCidade));
            }
        });
    }

    function darZoomNaRegiao(cidade, terras, rapido = false) {
        layerAncoras.clearLayers(); 
        layerPropriedades.clearLayers();

        localStorage.setItem('cidade_aberta_agro', cidade.nome);

        document.getElementById('nome-cidade-atual').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${cidade.nome}`;
        document.getElementById('painel-cidade-topo').style.display = 'flex';

        let tempoAnimacao = rapido ? 0 : 1.5;
        let tempoEspera = rapido ? 50 : 1200;

        map.flyTo([cidade.lat, cidade.lng], 1, { duration: tempoAnimacao });

        setTimeout(() => {
            let colunas = 4;
            let espacoEntrePinos = 85; 
            
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

                L.marker([posY, posX], {icon: createCustomIcon(f)})
                 .addTo(layerPropriedades)
                 .on('click', () => {
                     if(!f.dono_id) {
                         abrirModalCompra(f);
                     } else if(f.e_minha) {
                         abrirModalDono(f);
                     } else {
                         // VISITA À FAZENDA DE OUTRO JOGADOR
                         showSweet(
                            f.nome, 
                            `<div style="color:#aaa; margin-bottom: 15px;">Propriedade de <b style="color:#ffb300;">${f.dono_nome}</b></div>`, 
                            `<button class="sweet-btn" style="background: #0288d1; color: white; margin-top: 10px;" onclick="window.location.href='/fazenda/${f.id}'"><i class="fas fa-eye"></i> VISITAR FAZENDA</button>`
                         ); 
                     }
                 });
            });

        }, tempoEspera); 
    }

    window.voltarMapaGlobal = function() {
        localStorage.removeItem('cidade_aberta_agro');

        document.getElementById('painel-cidade-topo').style.display = 'none';
        layerPropriedades.clearLayers(); 
        renderizarAncoras();             
        
        map.flyToBounds(mapBounds, { duration: 1.5 });
    }

});
