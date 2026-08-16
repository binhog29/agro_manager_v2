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
    } else if (status === 'plantado' || status === 'colhendo') {
        
        Swal.fire({ title: 'Analisando Lavoura...', didOpen: () => Swal.showLoading() });
        
        const resposta = await fetch(`/api/cultivo/detalhes?lote_id=${loteId}`);
        const dados = await resposta.json();
        
        if (!dados.sucesso) return Swal.fire('Erro', 'Falha ao ler dados da terra.', 'error');

        Swal.fire({
            title: `Lavoura de ${tipoCultivo.charAt(0).toUpperCase() + tipoCultivo.slice(1)}`,
            html: `
                <div style="text-align: left; margin-bottom: 15px; background: #222; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Produtividade Estimada:</span>
                        <strong style="color: ${dados.produtividade > 70 ? '#4caf50' : '#f44336'};">${dados.produtividade}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Fertilidade do Solo:</span>
                        <strong style="color: ${dados.fertilidade > 50 ? '#4caf50' : '#f44336'};">${dados.fertilidade}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #aaa;">Nível de Pragas:</span>
                        <strong style="color: ${dados.pragas < 30 ? '#4caf50' : '#f44336'};">${dados.pragas}%</strong>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="swal2-styled" style="background: #795548; margin: 0; font-size: 12px; font-weight: bold;" onclick="manejoLavoura(${loteId}, 'adubar')">
                        <i class="fas fa-poop"></i> Adubar<br><span style="font-size:10px; font-weight:normal;">(Estoque: ${dados.est_adubo})</span>
                    </button>
                    <button class="swal2-styled" style="background: #e53935; margin: 0; font-size: 12px; font-weight: bold;" onclick="manejoLavoura(${loteId}, 'pulverizar')">
                        <i class="fas fa-helicopter"></i> Pulverizar<br><span style="font-size:10px; font-weight:normal;">(Estoque: ${dados.est_veneno})</span>
                    </button>
                    
                    ${status === 'colhendo' ? `
                        <button class="swal2-styled" style="background: #fbc02d; color: #000; margin: 0; grid-column: span 2; font-weight: bold;" onclick="colherLavoura(${loteId})">
                            <i class="fas fa-tractor"></i> Contratar Colheita
                        </button>
                    ` : `
                        <button class="swal2-styled" style="background: #444; color: #888; margin: 0; grid-column: span 2; font-weight: bold; cursor: not-allowed;" disabled>
                            <i class="fas fa-clock"></i> Crescendo...
                        </button>
                    `}
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
    Swal.fire({ title: 'Precedimentos de Plantio...', didOpen: () => Swal.showLoading() });
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
