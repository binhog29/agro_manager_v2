document.addEventListener('DOMContentLoaded', function() {
    
    // Injeta estilo CSS para a animação da rodovia e prioridade máxima dos modais
    const estiloAnimacao = document.createElement('style');
    estiloAnimacao.innerHTML = `
        @keyframes dashAnim { to { stroke-dashoffset: -20; } }
        .rota-tracejada-animada { animation: dashAnim 0.8s linear infinite; }
        .swal2-container { z-index: 99999 !important; } /* 🔥 Joga o modal acima de qualquer barra ou menu */
    `;
    document.head.appendChild(estiloAnimacao);

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

    // Carregamento Único do Mapa Global
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

        // Carrega a Frota em Trânsito
        fetch('/api/mapa_frota')
        .then(r => r.json())
        .then(frota => {
            if (frota.length > 0) {
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
                    btnFrota.onmouseover = () => btnFrota.style.transform = 'scale(1.05)';
                    btnFrota.onmouseout = () => btnFrota.style.transform = 'scale(1)';
                    document.body.appendChild(btnFrota);
                }
                
                btnFrota.innerHTML = `<i class="fas fa-truck-moving" style="font-size: 18px;"></i> <span>${frota.length} Transporte(s)</span>`;
                
                btnFrota.onclick = () => {
                    let htmlList = '<div style="text-align: left; max-height: 45vh; overflow-y: auto; padding-right: 5px;">';
                    frota.forEach(viagem => {
                        let orig = todasAsTerras.find(t => t.id === viagem.origem_id);
                        let dest = todasAsTerras.find(t => t.id === viagem.destino_id);
                        let nomeO = orig ? orig.nome : "Origem Desconhecida";
                        let nomeD = dest ? dest.nome : "Destino Desconhecido";
                        
                        htmlList += `
                        <div style="background: #222; border-left: 4px solid #ff9800; padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #333;">
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
                let btnFrota = document.getElementById('btn-frota-ativa');
                if (btnFrota) btnFrota.remove();
            }
        });
    }).catch(erro => console.error(erro));
    
    // Renderização de Âncoras do Mapa
    function renderizarAncoras() {
        layerPropriedades.clearLayers(); 
        layerAncoras.clearLayers();      

        // 1. Cidades
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

        // 2. Concessionária
        let latConcessionaria = 940;  
        let lngConcessionaria = 620;  
        let htmlConcessionaria = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; transition: transform 0.2s;" onclick="abrirConcessionaria()" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <div style="background: linear-gradient(135deg, #fbc02d, #f57f17); border: 1px solid #fff; color: #111; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                    <i class="fas fa-tractor"></i> Máquinas
                </div>
                <i class="fas fa-map-marker" style="color: #fbc02d; font-size: 34px; filter: drop-shadow(0px 4px 5px rgba(0,0,0,0.8));"></i>
            </div>`;
        let iconConcessionaria = L.divIcon({ html: htmlConcessionaria, className: '', iconSize: [120, 70], iconAnchor: [60, 68] });
        L.marker([latConcessionaria, lngConcessionaria], {icon: iconConcessionaria}).addTo(layerAncoras);
        
        // 3. Leilão / Mercado
        let latLeilao = 1150; 
        let lngLeilao = 680;  
        let htmlLeilao = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; transition: transform 0.2s;" onclick="window.location.href='/mercado'" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <div style="background: linear-gradient(135deg, #f57c00, #e65100); border: 1px solid #fff; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                    <i class="fas fa-gavel"></i> Leilão
                </div>
                <i class="fas fa-map-marker" style="color: #f57c00; font-size: 34px; filter: drop-shadow(0px 4px 5px rgba(0,0,0,0.8));"></i>
            </div>`;
        let iconLeilao = L.divIcon({ html: htmlLeilao, className: '', iconSize: [120, 70], iconAnchor: [60, 68] });
        L.marker([latLeilao, lngLeilao], {icon: iconLeilao}).addTo(layerAncoras);

        // 4. Loja Agrícola
        let latLoja = 1050; 
        let lngLoja = 550;  
        let htmlLoja = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; transition: transform 0.2s;" onclick="abrirLoja()" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <div style="background: linear-gradient(135deg, #4caf50, #1b5e20); border: 1px solid #fff; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                    <i class="fas fa-store"></i> Loja
                </div>
                <i class="fas fa-map-marker" style="color: #4caf50; font-size: 34px; filter: drop-shadow(0px 4px 5px rgba(0,0,0,0.8));"></i>
            </div>`;
        let iconLoja = L.divIcon({ html: htmlLoja, className: '', iconSize: [120, 70], iconAnchor: [60, 68] });
        L.marker([latLoja, lngLoja], {icon: iconLoja}).addTo(layerAncoras);
    }
    
    // ==========================================
    // 🚜 SISTEMA DA CONCESSIONÁRIA
    // ==========================================
    window.abrirConcessionaria = function() {
        const minhasTerras = todasAsTerras.filter(t => t.e_minha);
        if(minhasTerras.length === 0) {
            Swal.fire('Atenção', 'Você precisa comprar uma propriedade antes de adquirir máquinas!', 'warning');
            return;
        }

        let selectFazenda = `<select id="conc-fazenda-destino" style="width:100%; padding:12px; border-radius:8px; border:1px solid #444; background:#111; color:#fff; margin-bottom:15px; font-family: 'Poppins', sans-serif; font-size: 14px; outline: none;">`;
        minhasTerras.forEach(t => { selectFazenda += `<option value="${t.id}">${t.nome}</option>`; });
        selectFazenda += `</select>`;

        const catalogo = [
            { chave: 'trator_leve', nome: 'Trator Leve', preco: 85000, desc: 'Tração geral. Usado na adubação automática.', imagem: 'trator_leve.png', icon: 'fa-tractor', cor: '#ff9800' },
            { chave: 'trator_pesado', nome: 'Trator Pesado', preco: 350000, desc: 'Alta potência e confiabilidade diária.', imagem: 'trator_pesado.png', icon: 'fa-tractor', cor: '#f57c00' },
            { chave: 'trator_esteira', nome: 'Trator de Esteira', preco: 450000, desc: 'Desmatamento pesado. Extrai +R$1.000 por Hectare.', imagem: 'trator_esteira.png', icon: 'fa-snowplow', cor: '#fbc02d' },
            { chave: 'escavadeira', nome: 'Escavadeira', preco: 550000, desc: 'Zera custos de escavação em bebedouros e represas.', imagem: 'escavadeira.png', icon: 'fa-water', cor: '#03a9f4' },
            { chave: 'colheitadeira', nome: 'Colheitadeira Grãos', preco: 850000, desc: 'Zera as taxas de aluguel na colheita.', imagem: 'colheitadeira.png', icon: 'fa-truck-monster', cor: '#4caf50' },
            { chave: 'pulverizador', nome: 'Pulverizador Autopropelido', preco: 420000, desc: 'Aplica defensivos sem custo de aluguel.', imagem: 'pulverizador.png', icon: 'fa-spray-can', cor: '#ab47bc' },
            { chave: 'pulv_arrasto', nome: 'Pulverizador de Arrasto', preco: 35000, desc: 'Econômico. Zera aluguel, mas gasta horas.', imagem: 'pulv_arrasto.png', icon: 'fa-spray-can', cor: '#9c27b0' },
            { chave: 'plantadeira', nome: 'Plantadeira', preco: 150000, desc: 'Reduz os custos logísticos no plantio.', imagem: 'plantadeira.png', icon: 'fa-seedling', cor: '#8bc34a' },
            { chave: 'grade_aradora', nome: 'Grade Aradora', preco: 65000, desc: 'Reduz em 80% o custo para Arar a terra.', imagem: 'grade_aradora.png', icon: 'fa-tools', cor: '#795548' },
            { chave: 'caminhonete_usada', nome: 'Caminhonete Usada', preco: 45000, desc: 'Frete grátis básico para lotes pequenos.', imagem: 'caminhonete_usada.png', icon: 'fa-truck-pickup', cor: '#9e9e9e' },
            { chave: 'caminhonete_nova', nome: 'Caminhonete Nova', preco: 180000, desc: 'Maior capacidade e menos gastos na oficina.', imagem: 'caminhonete_nova.png', icon: 'fa-truck-pickup', cor: '#e0e0e0' },
            { chave: 'caminhao_boiadeiro', nome: 'Caminhão Boiadeiro', preco: 250000, desc: 'Frete grátis para Gado, Porcos e Cavalos.', imagem: 'caminhao_boiadeiro.png', icon: 'fa-truck', cor: '#8d6e63' },
            { chave: 'caminhao_bau', nome: 'Caminhão Baú (Frios)', preco: 200000, desc: 'Frete grátis para logística de Peixes.', imagem: 'caminhao_bau.png', icon: 'fa-snowflake', cor: '#81d4fa' }
        ];

        let htmlList = `<div style="text-align:left; color:#fff; font-family: 'Poppins', sans-serif;">`;
        htmlList += `<label style="color:#aaa; font-size:12px;"><b>1. Onde estacionar a máquina?</b></label><br>${selectFazenda}`;
        htmlList += `<label style="color:#aaa; font-size:12px;"><b>2. Veículos e Implementos:</b></label><div style="max-height: 50vh; overflow-y: auto; padding-right: 5px; margin-top:5px; display: grid; gap: 10px;">`;
        
        catalogo.forEach(m => {
            htmlList += `
            <div style="background: #1a1a24; border: 1px solid #333; padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 15px; align-items: center; width: 65%;">
                    <div style="background: #111; border: 1px solid #444; min-width: 60px; height: 60px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <img src="/static/img/${m.imagem}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" style="max-width: 50px; max-height: 50px; object-fit: contain;">
                        <i class="fas ${m.icon}" style="font-size: 24px; color: ${m.cor}; display: none;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 900; font-size: 14px; color: #fff;">${m.nome}</div>
                        <div style="font-size: 11px; color: #888; line-height: 1.4; margin-top: 3px;">${m.desc}</div>
                    </div>
                </div>
                <div style="text-align: right; width: 35%;">
                    <div style="color: #4caf50; font-weight: 900; font-size: 15px; margin-bottom: 6px;">R$ ${m.preco.toLocaleString('pt-BR')}</div>
                    <button onclick="confirmarCompraMaquina('${m.chave}', '${m.nome}', ${m.preco})" style="background: linear-gradient(135deg, #2e7d32, #1b5e20); color: white; border: none; padding: 8px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; width: 100%;">
                        <i class="fas fa-shopping-cart"></i> COMPRAR
                    </button>
                </div>
            </div>`;
        });
        htmlList += `</div></div>`;

        Swal.fire({
            title: '<span style="color:#fbc02d;"><i class="fas fa-tractor"></i> Concessionária Premium</span>',
            html: htmlList, background: '#121212', color: '#fff',
            showConfirmButton: false, showCloseButton: true, width: '95%'
        });
    }
    
    window.confirmarCompraMaquina = function(chave, nome, preco) {
        let fazenda_id = document.getElementById('conc-fazenda-destino').value;
        if(!fazenda_id) { Swal.fire('Atenção', 'Selecione uma fazenda primeiro!', 'warning'); return; }

        Swal.fire({
            title: `Confirmar Compra?`,
            html: `O veículo <b>${nome}</b> será entregue no barracão.<br><br><span style="color:#f44336; font-size: 18px; font-weight: bold;">- R$ ${preco.toLocaleString('pt-BR')}</span>`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Comprar', cancelButtonText: 'Cancelar',
            background: '#1a1a24', color: '#fff', confirmButtonColor: '#2e7d32'
        }).then((res) => {
            if(res.isConfirmed) {
                Swal.fire({ title: 'Despachando Carga...', background: '#1a1a24', color: '#fff', didOpen: () => Swal.showLoading() });
                fetch('/api/barracao/comprar', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ chave_maquina: chave, fazenda_id: parseInt(fazenda_id) })
                }).then(r => r.json()).then(d => {
                    if(d.sucesso) Swal.fire('Entregue! 🚜', d.msg, 'success').then(() => location.reload());
                    else Swal.fire('Negado', d.erro, 'error');
                });
            }
        });
    }
    
        // ==========================================
    // 🏪 SISTEMA DA LOJA AGRÍCOLA COMPLETO
    // ==========================================
    window.abrirLoja = function() {
        const minhasTerras = todasAsTerras.filter(t => t.e_minha);
        if(minhasTerras.length === 0) {
            Swal.fire('Atenção', 'Você precisa de uma propriedade para receber os insumos!', 'warning');
            return;
        }

        let selectFazenda = `<select id="loja-fazenda-destino" style="width:100%; padding:12px; border-radius:8px; border:1px solid #444; background:#111; color:#fff; margin-bottom:15px; font-family: 'Poppins', sans-serif; font-size: 14px; outline: none;">`;
        minhasTerras.forEach(t => { selectFazenda += `<option value="${t.id}">${t.nome}</option>`; });
        selectFazenda += `</select>`;

        const catalogoLoja = [
            { chave: 'sal', nome: 'Sal Mineral', preco: 25 },
            { chave: 'racao', nome: 'Ração (Gado/Porco)', preco: 40 },
            { chave: 'racao_peixe', nome: 'Ração de Peixe', preco: 35 },
            { chave: 'adubo', nome: 'Adubo NPK', preco: 50 },
            { chave: 'veneno', nome: 'Defensivos Agrícolas', preco: 80 },
            { chave: 'combustivel', nome: 'Galão de Diesel', preco: 150 },
            { chave: 'vacina_aftosa', nome: 'Vacina Aftosa', preco: 50 },
            { chave: 'vacina_brucelose', nome: 'Vacina Brucelose', preco: 60 },
            { chave: 'medicamento_geral', nome: 'Medicamento Geral', preco: 30 },
            { chave: 'suplemento_engorda', nome: 'Suplemento Engorda', preco: 40 },
            { chave: 'soja', nome: 'Sementes de Soja', preco: 350 },
            { chave: 'milho', nome: 'Sementes de Milho', preco: 200 },
            { chave: 'arroz', nome: 'Sementes de Arroz', preco: 180 },
            { chave: 'feijao', nome: 'Sementes de Feijão', preco: 250 },
            { chave: 'algodao', nome: 'Sementes de Algodão', preco: 400 },
            { chave: 'cafe', nome: 'Mudas de Café', preco: 500 }
        ];

        let htmlList = `<div style="text-align:left; color:#fff; font-family: 'Poppins', sans-serif;">`;
        htmlList += `<label style="color:#aaa; font-size:12px;"><b>1. Destino da Carga (Suas Fazendas):</b></label><br>${selectFazenda}`;
        htmlList += `<label style="color:#aaa; font-size:12px;"><b>2. Insumos e Sementes:</b></label>`;
        htmlList += `<div style="max-height: 55vh; overflow-y: auto; padding-right: 8px; margin-top:8px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
        
        catalogoLoja.forEach(m => {
            htmlList += `
            <div style="background: #1a1a24; border: 1px solid #333; padding: 12px; border-radius: 10px; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                        <img src="/static/img/${m.chave}.png" onerror="this.src='/static/img/adubo.png'" style="max-height: 45px; max-width: 45px; object-fit: contain;">
                    </div>
                    <div style="font-weight: bold; font-size: 13px; color: #fff; margin-bottom: 2px; line-height: 1.3;">${m.nome}</div>
                    <div style="color: #4caf50; font-weight: 900; font-size: 14px; margin-bottom: 10px;">R$ ${m.preco.toLocaleString('pt-BR')}</div>
                </div>
                <button onclick="confirmarCompraLoja('${m.chave}', '${m.nome}', ${m.preco})" style="background: linear-gradient(135deg, #2e7d32, #1b5e20); color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; width: 100%;">
                    <i class="fas fa-shopping-cart"></i> COMPRAR
                </button>
            </div>`;
        });
        htmlList += `</div></div>`;

        Swal.fire({
            title: '<span style="color:#4caf50;"><i class="fas fa-store"></i> Loja Agrícola</span>',
            html: htmlList, background: '#121212', color: '#fff',
            showConfirmButton: false, showCloseButton: true, width: '92%'
        });
    }

    window.confirmarCompraLoja = function(chave, nome, preco) {
        let fazenda_id = document.getElementById('loja-fazenda-destino').value;
        if(!fazenda_id) { Swal.fire('Atenção', 'Selecione uma fazenda primeiro!', 'warning'); return; }

        Swal.fire({
            title: `Comprar ${nome}`,
            html: `Quantas unidades você deseja comprar?<br><br><span style="color:#aaa; font-size: 13px;">Preço unitário: R$ ${preco.toLocaleString('pt-BR')}</span>`,
            input: 'number', inputAttributes: { min: 1, value: 1 },
            showCancelButton: true, confirmButtonText: 'Comprar', cancelButtonText: 'Cancelar',
            background: '#1a1a24', color: '#fff', confirmButtonColor: '#2e7d32'
        }).then((res) => {
            if(res.isConfirmed && res.value > 0) {
                Swal.fire({ title: 'Despachando Carga...', background: '#1a1a24', color: '#fff', didOpen: () => Swal.showLoading() });
                fetch('/api/loja/comprar', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ item: chave, quantidade: parseInt(res.value), fazenda_id: parseInt(fazenda_id) })
                }).then(r => r.json()).then(d => {
                    if(d.sucesso) Swal.fire('Entregue! 📦', d.msg, 'success');
                    else Swal.fire('Atenção', d.erro, 'warning');
                });
            }
        });
    }

    // Função de Zoom na Região
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
