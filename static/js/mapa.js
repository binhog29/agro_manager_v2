document.addEventListener('DOMContentLoaded', function() {
    
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
    
    // ATENÇÃO: Verifique se o nome da sua imagem está correto aqui!
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

        // Funções para montar os modais exatamente como nos seus prints
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

    // Lógica real que conversa com o servidor
    window.comprar = function(id) {
        fetch(`/api/comprar_fazenda/${id}`, {method:'POST'})
        .then(r => r.json())
        .then(d => {
            if(d.sucesso) {
                location.reload(); // Recarrega a página para descontar o saldo e pintar o pino
            } else {
                alert(d.erro);
            }
        });
    }

        window.renomear = function(id) {
        // Cria a caixa de texto com o nosso design
        const inputHtml = `
            <p style="margin-bottom: 10px; font-size: 13px; color: #666;">Digite o novo nome da propriedade:</p>
            <input type="text" id="input-novo-nome" placeholder="Novo nome..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; outline: none; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
        `;
        
        // Cria os botões do modal
        const btnHtml = `
            <button class="sweet-btn" style="background: #2e7d32; color: white;" onclick="confirmarRenomear(${id})">SALVAR</button>
            <button class="sweet-btn sweet-btn-sec" onclick="closeModal()">CANCELAR</button>
        `;
        
        // Chama a nossa tela bonita
        showSweet("Renomear Fazenda", inputHtml, btnHtml);
    }

    // Função que é ativada quando o jogador clica em SALVAR no modal novo
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

    // 4. Criação dos Pinos
    function createCustomIcon(f) {
        let icon = 'fa-map-marker-alt'; 
        let colorClass = 'c-livre';
        let mainLabel = f.nome; 
        let subLabel = `R$ ${f.preco.toLocaleString('pt-BR')}`;
        
        if (f.dono_id) {
            subLabel = "Comprado"; 
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
            
            // Configuração da Grade
            const colunas = 6; 
            const margemEsquerda = 250; 
            const espacoX = (imageWidth - 500) / colunas; 
            const espacoY = 160; 

            data.forEach((f, index) => {
                let linha = Math.floor(index / colunas);
                let coluna = index % colunas;

                // Efeito Zigue-Zague
                let offsetZigueZague = (linha % 2 === 0) ? 0 : (espacoX / 2);

                let posX = margemEsquerda + (coluna * espacoX) + offsetZigueZague;
                let posY = imageHeight - 200 - (linha * espacoY);
                
                L.marker([posY, posX], {icon: createCustomIcon(f)})
                 .addTo(map)
                 .on('click', () => {
                     if(!f.dono_id) abrirModalCompra(f);
                     else if(f.e_minha) abrirModalDono(f);
                     else showSweet(f.nome, "Propriedade de outro jogador", "");
                 });
            });
        })
        .catch(erro => console.error("Erro na API de mapa:", erro));
});
