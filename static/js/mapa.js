// CONTROLE DE ATUALIZAÇÕES DO JOGO (Altere a versão para forçar o aviso aos players)
const VERSAO_ATUAL = "1.1"; 

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // SISTEMA DE AVISO DE PATCH NOTES (NOVIDADES)
    // ==========================================
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
    // ==========================================

    // 1. Configuração do Mapa Leaflet
    const imageHeight = 2000; 
    const imageWidth = 2000; 
    const mapBounds = [[0, 0], [imageHeight, imageWidth]];
    
    var map = L.map('map', { 
        crs: L.CRS.Simple, 
        minZoom: -2, 
        maxZoom: 1, 
        zoomControl: false, 
        attributionControl: false 
    });
    
    L.imageOverlay('/static/img/mapa_rondonia.png', mapBounds).addTo(map);
    map.fitBounds(mapBounds);

    // 2. Alerta Autodestruir
    setTimeout(() => {
        const alertas = document.querySelectorAll('.alerta-autodestruir');
        alertas.forEach(a => { 
            a.style.opacity = "0"; 
            setTimeout(() => a.remove(), 500); 
        });
    }, 3000);

    // 3. Funções do Modal
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
            if(d.sucesso) {
                location.reload(); 
            } else {
                alert(d.erro);
            }
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
        let novo = document.getElementById('input-novo-nome').value;
        
        if(novo && novo.trim() !== "") {
            fetch(`/api/renomear/fazenda/${id}`, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({nome: novo.trim()})
            }).then(() => location.reload());
        }
    }

    // 4. Criação dos Pinos (COM OS NOMES DOS JOGADORES)
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

    // 5. Busca as propriedades da API e espalha em grade
    fetch('/api/mapa_global')
        .then(r => r.json())
        .then(data => {
            const colunas = 6; 
            const margemEsquerda = 250; 
            const espacoX = (imageWidth - 500) / colunas; 
            const espacoY = 160; 

            data.forEach((f, index) => {
                let linha = Math.floor(index / colunas);
                let coluna = index % colunas;

                let offsetZigueZague = (linha % 2 === 0) ? 0 : (espacoX / 2);

                let posX = margemEsquerda + (coluna * espacoX) + offsetZigueZague;
                let posY = imageHeight - 200 - (linha * espacoY);
                
                L.marker([posY, posX], {icon: createCustomIcon(f)})
                 .addTo(map)
                 .on('click', () => {
                     if(!f.dono_id) abrirModalCompra(f);
                     else if(f.e_minha) abrirModalDono(f);
                     else showSweet(f.nome, `Propriedade de ${f.dono_nome}`, ""); 
                 });
            });
        })
        .catch(erro => console.error("Erro na API de mapa:", erro));
});
