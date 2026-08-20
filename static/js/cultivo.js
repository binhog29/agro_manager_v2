window.abrirGerenciamentoCultivo = async function(loteId, status, tipoCultivo) {
    
    if (status === 'arado' || status === 'coveado') {
        let tituloMenu = status === 'arado' ? 'Sementes (Grãos e Cereais)' : 'Mudas (Frutas e Pomar)';
        let botoesHTML = '';

        if (status === 'arado') {
            botoesHTML = `
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'soja')">Plantar Soja (R$ 650 com maq)</button>
                <button class="swal2-styled" style="background: #ff9800; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'milho')">Plantar Milho (R$ 500 com maq)</button>
                <button class="swal2-styled" style="background: #e0e0e0; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'arroz')">Plantar Arroz (R$ 480 com maq)</button>
                <button class="swal2-styled" style="background: #795548; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'feijao')">Plantar Feijão (R$ 550 com maq)</button>
                <button class="swal2-styled" style="background: #81c784; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cana')">Plantar Cana (R$ 600 com maq)</button>
                <button class="swal2-styled" style="background: #e53935; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'tomate')">Plantar Tomate (R$ 115 com maq)</button>
                <button class="swal2-styled" style="background: #d32f2f; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'mandioca')">Plantar Mandioca (R$ 250 com maq)</button>
            `;
        } else {
            botoesHTML = `
                <button class="swal2-styled" style="background: #4e342e; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cafe')">Plantar Café Clonal (R$ 650)</button>
                <button class="swal2-styled" style="background: #3e2723; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cacau')">Plantar Cacau (R$ 750)</button>
                <button class="swal2-styled" style="background: #311b92; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'acai')">Plantar Açaí (R$ 600)</button>
                <button class="swal2-styled" style="background: #8d6e63; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cupuacu')">Plantar Cupuaçu (R$ 550)</button>
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'banana')">Plantar Banana (R$ 300)</button>
                <button class="swal2-styled" style="background: #cddc39; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'abacaxi')">Plantar Abacaxi (R$ 350)</button>
                <button class="swal2-styled" style="background: #d32f2f; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'pimenta')">Plantar Pimenta (R$ 400)</button>
                <button class="swal2-styled" style="background: #4caf50; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'melancia')">Plantar Melancia (R$ 150)</button>
            `;
        }

        Swal.fire({
            title: tituloMenu,
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 15px;">
                    ${botoesHTML}
                    <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
                    <button class="swal2-styled" style="background: #555; width: 100%;" onclick="reverterParaMato(${loteId})"><i class="fas fa-undo"></i> Abandonar Terra</button>
                </div>
            `,
            background: '#2a2a2a',
            color: '#fff',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    } 
    else if (status === 'plantado' || status === 'colhendo' || status === 'colheita_incompleta') {
        
        Swal.fire({ title: 'Analisando Lavoura...', didOpen: () => Swal.showLoading() });
        
        const resposta = await fetch(`/api/cultivo/detalhes?lote_id=${loteId}`);
        const dados = await resposta.json();
        
        if (!dados.sucesso) return Swal.fire('Erro', 'Falha ao ler dados da terra.', 'error');

        const statusReal = dados.status;

        let estiloBotao = `background: #444; color: #888; cursor: not-allowed;`;
        let textoBotao = `<i class="fas fa-clock"></i> Crescendo...`;

        if (statusReal === 'plantado') {
            estiloBotao = `background: linear-gradient(90deg, #2e7d32 ${dados.progresso_pct}%, #333333 ${dados.progresso_pct}%); color: white; cursor: not-allowed; border: 1px solid #555;`;
            
            if (dados.estagio.includes('Aguardando') || dados.estagio === 'Ponto de Colheita') {
                textoBotao = `🕒 ${dados.estagio}`;
            } else {
                textoBotao = `🕒 ${dados.estagio} (Faltam ${dados.dias_restantes} dias)`;
            }
            
        } else if (statusReal === 'colhendo') {
            estiloBotao = `background: #fbc02d; color: #000; cursor: pointer; border: 1px solid #c89600;`;
            textoBotao = `<i class="fas fa-tractor"></i> Contratar Colheita`;
        } 
        else if (statusReal === 'colheita_incompleta') {
            estiloBotao = `background: #ff9800; color: #000; cursor: pointer; border: 1px solid #e65100; box-shadow: 0 0 10px rgba(255,152,0,0.5);`;
            textoBotao = `<i class="fas fa-exclamation-triangle"></i> Retomar Colheita`;
        }

        Swal.fire({
            title: `Lavoura de ${tipoCultivo.charAt(0).toUpperCase() + tipoCultivo.slice(1)}`,
            html: `
                <div style="text-align: left; margin-bottom: 15px; background: #222; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Produtividade Estimada:</span>
                        <strong style="color: ${dados.produtividade > 70 ? '#4caf50' : '#f44336'};">${Math.round(dados.produtividade)}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Fertilidade do Solo:</span>
                        <strong style="color: ${dados.fertilidade > 50 ? '#4caf50' : '#f44336'};">${Math.round(dados.fertilidade)}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #aaa;">Nível de Pragas:</span>
                        <strong style="color: ${dados.pragas < 30 ? '#4caf50' : '#f44336'};">${Math.round(dados.pragas)}%</strong>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="swal2-styled" style="background: #795548; margin: 0; font-size: 12px; font-weight: bold;" onclick="manejoLavoura(${loteId}, 'adubar')">
                        <i class="fas fa-poop"></i> Adubar<br><span style="font-size:10px; font-weight:normal;">(Estoque: ${dados.est_adubo})</span>
                    </button>
                    <button class="swal2-styled" style="background: #e53935; margin: 0; font-size: 12px; font-weight: bold;" onclick="manejoLavoura(${loteId}, 'pulverizar')">
                        <i class="fas fa-helicopter"></i> Pulverizar<br><span style="font-size:10px; font-weight:normal;">(Estoque: ${dados.est_veneno})</span>
                    </button>
                    
                    <button class="swal2-styled" style="${estiloBotao} margin: 0; grid-column: span 2; font-weight: bold;" ${statusReal === 'plantado' ? 'disabled' : `onclick="colherLavoura(${loteId})"`}>
                        ${textoBotao}
                    </button>

                    <button class="swal2-styled" style="background: #c62828; color: #fff; margin: 0; margin-top: 5px; grid-column: span 2; font-weight: bold;" onclick="reverterCultivo(${loteId})">
                        <i class="fas fa-tractor"></i> Passar Trator (Remover Lavoura)
                    </button>
                </div>
            `,
            background: '#2a2a2a',
            color: '#fff',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    }
};

window.plantarSemente = function(loteId, tipo) {
    Swal.fire({ title: 'Procedimentos de Plantio...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/plantar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, tipo_cultivo: tipo })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.manejoLavoura = function(loteId, acao_manejo) {
    Swal.fire({ title: 'Aplicando manejo...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/manejo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, acao: acao_manejo })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.colherLavoura = function(loteId) {
    Swal.fire({ title: 'Colhendo a safra...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/colher', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Colheita Finalizada!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.reverterParaMato = function(loteId) {
    Swal.fire({
        title: 'Abandonar Terra?',
        text: 'A terra será consumida pelo mato e todo o investimento será perdido.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#555',
        confirmButtonText: 'Sim, abandonar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Abandonando...', didOpen: () => Swal.showLoading() });
            fetch('/api/cultivo/abandonar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ lote_id: loteId })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Feito!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};

window.reverterCultivo = function(loteId) {
    Swal.fire({
        title: 'Passar o Trator?',
        text: "Isso vai destruir toda a sua lavoura atual! O serviço de limpeza com trator custa R$ 300 e a terra voltará a ficar limpa para um novo plantio. Deseja continuar?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sim, destruir lavoura!'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Passando o trator...', didOpen: () => Swal.showLoading() });

            fetch('/api/fazenda/reverter_cultivo', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ lote_id: loteId })
            })
            .then(r => r.json())
            .then(d => {
                if(d.sucesso) {
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => {
                        localStorage.setItem('aba_ativa_fazenda', 'cultivo');
                        location.reload();
                    });
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            })
            .catch(erro => {
                Swal.fire('Erro no Servidor', 'Não foi possível completar a ação.', 'error');
            });
        }
    });
};
