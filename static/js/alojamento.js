window.abrirModalRH = async function() {
    abrirModal('modal-rh');
    document.getElementById('rh-loading').style.display = 'block';
    document.getElementById('rh-content').style.display = 'none';

    const prop_id = window.location.pathname.split('/').pop();

    try {
        const res = await fetch(`/api/rh/listar/${prop_id}`);
        const data = await res.json();
        
        if (!data.sucesso) {
            Swal.fire('Erro', data.erro, 'error');
            fecharModal('modal-rh');
            return;
        }

        const equipeAtual = data.equipe;
        const catalogoRH = [
            { id: 'peoes', nome: 'Peão', custo: 1000, salario: 25, icone: 'fa-shield-alt', benef: 'Protege Animais' },
            { id: 'tratoristas', nome: 'Tratorista', custo: 2500, salario: 45, icone: 'fa-tractor', benef: '+15% Colheita' },
            { id: 'capatazes', nome: 'Capataz', custo: 10000, salario: 150, icone: 'fa-dollar-sign', benef: '+10% Venda' },
            { id: 'veterinarios', nome: 'Veterinário', custo: 8000, salario: 120, icone: 'fa-notes-medical', benef: 'Reduz Doenças' },
            { id: 'agronomos', nome: 'Agrônomo', custo: 9000, salario: 130, icone: 'fa-seedling', benef: 'Safra Rápida' }
        ];

        let equipeHtml = '';
        let totalFolha = 0;

        catalogoRH.forEach(c => {
            let qtd = equipeAtual[c.id] || 0;
            if (qtd > 0) {
                totalFolha += (qtd * c.salario);
                equipeHtml += `
                <div style="background: #222; padding: 10px; border-radius: 6px; margin-bottom: 6px; border-left: 4px solid #4caf50; border: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #fff; font-weight: bold; font-size: 14px;"><i class="fas ${c.icone}" style="color: #4caf50;"></i> ${qtd}x ${c.nome}</div>
                        <div style="font-size: 11px; color: #8bc34a; font-weight: bold;">Efeito: ${c.benef}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                        <span style="color: #ff5252; font-size: 13px; font-weight: bold;">R$ ${qtd * c.salario}/h</span>
                        <button onclick="demitirFuncionario('${prop_id}', '${c.id}')" style="background: #d32f2f; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;">
                            <i class="fas fa-user-minus"></i> Demitir 1
                        </button>
                    </div>
                </div>`;
            }
        });

        if (equipeHtml === '') {
            equipeHtml = '<div style="text-align:center; padding: 15px; color:#888; font-size: 13px; background: #222; border-radius: 6px; border: 1px dashed #444;">Sua fazenda não tem nenhum funcionário.</div>';
        }

        let listaContratacaoHtml = catalogoRH.map(c => `
            <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #444;">
                <div>
                    <h4 style="margin: 0; color: #fff; font-size: 15px;">${c.nome}</h4>
                    <span style="font-size: 12px; color: #ff5252; font-weight: bold;">Custo: R$ ${c.custo.toLocaleString('pt-BR')} (R$ ${c.salario}/h)</span>
                    <div style="font-size: 11px; color: #4caf50; margin-top: 3px; font-weight: bold;"><i class="fas ${c.icone}"></i> ${c.benef}</div>
                </div>
                <button style="padding: 8px 12px; font-size: 12px; background: #2e7d32; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;" onclick="contratarFuncionario('${prop_id}', '${c.id}')">CONTRATAR</button>
            </div>
        `).join('');

        document.getElementById('rh-folha-total').innerText = `Folha: R$ ${totalFolha}/h`;
        document.getElementById('rh-lista-equipe').innerHTML = equipeHtml;
        document.getElementById('rh-lista-contratar').innerHTML = listaContratacaoHtml;

        document.getElementById('rh-loading').style.display = 'none';
        document.getElementById('rh-content').style.display = 'block';

    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Falha ao buscar dados do RH', 'error');
    }
}

window.contratarFuncionario = function(prop_id, cargo) {
    Swal.fire({
        title: 'Assinar Contrato', text: "Deseja contratar este profissional?", icon: 'question',
        background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#2e7d32', confirmButtonText: 'Sim'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando...', didOpen: () => Swal.showLoading() });
            fetch('/api/rh/contratar', {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ propriedade_id: prop_id, cargo: cargo })
            }).then(r => r.json()).then(d => {
                if (d.sucesso) Swal.fire('Contratado!', d.msg, 'success').then(() => { localStorage.setItem('modal_aberto_fazenda', 'modal-rh'); location.reload(); });
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
}

window.demitirFuncionario = function(prop_id, cargo) {
    Swal.fire({
        title: 'Demitir Funcionário?', text: "Tem certeza que deseja dispensar este profissional?", icon: 'warning',
        background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'Sim', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando rescisão...', didOpen: () => Swal.showLoading() });
            fetch('/api/rh/demitir', {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ propriedade_id: prop_id, cargo: cargo })
            }).then(r => r.json()).then(d => {
                if (d.sucesso) Swal.fire('Demitido!', d.msg, 'success').then(() => { localStorage.setItem('modal_aberto_fazenda', 'modal-rh'); location.reload(); });
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
}
