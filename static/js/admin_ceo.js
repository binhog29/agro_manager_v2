window.godAction = function(url, data) {
    Swal.fire({ title: 'Aguarde...', didOpen: () => Swal.showLoading() });
    fetch(url, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.injetarSaldo = function(id, nome) {
    Swal.fire({
        title: `Saldo de ${nome}`, text: "Digite o valor (Use o sinal de - para remover)", input: 'number', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonText: 'Aplicar'
    }).then(r => { if(r.isConfirmed && r.value) godAction('/api/admin/injetar_saldo', {jogador_id: id, valor: parseFloat(r.value)}); });
};

window.injetarXP = function(id, nome) {
    Swal.fire({
        title: `XP de ${nome}`, text: "Digite o XP (Use o sinal de - para remover)", input: 'number', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonText: 'Aplicar'
    }).then(r => { if(r.isConfirmed && r.value) godAction('/api/admin/injetar_xp', {jogador_id: id, valor: parseInt(r.value)}); });
};

window.milagreVida = function(id, nome) {
    Swal.fire({ title: 'Milagre da Vida', text: `Zerar a fome e curar TODOS os animais de ${nome}?`, icon: 'question', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#e91e63', confirmButtonText: 'Fazer Milagre'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/milagre_vida', {jogador_id: id}); });
};

window.bencaoColheita = function(id, nome) {
    Swal.fire({ title: 'Bênção da Colheita', text: `Forçar crescimento de todas as lavouras de ${nome}?`, icon: 'question', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#8bc34a', confirmButtonText: 'Crescer Tudo'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/bencao_colheita', {jogador_id: id}); });
};

window.confiscarTerras = function(id, nome) {
    Swal.fire({ title: 'Confiscar Terras', text: `Tomar todas as fazendas de ${nome} e devolver ao Estado?`, icon: 'warning', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#ff9800', confirmButtonText: 'Confiscar'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/confiscar_terras', {jogador_id: id}); });
};

window.deletarConta = function(id, nome) {
    Swal.fire({ title: 'Banir Jogador', text: `Tem certeza que deseja deletar a conta de ${nome}?`, icon: 'error', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'DELETAR'
    }).then(r => { if(r.isConfirmed) godAction('/api/admin/deletar_conta', {jogador_id: id}); });
};

window.injetarInsumo = async function(id, nome) {
    const { value: formValues } = await Swal.fire({
        title: `Spawnar Insumos para ${nome}`,
        html: `
            <select id="swal-item" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:85%;">
                <option value="soja">Soja</option><option value="milho">Milho</option>
                <option value="racao">Ração</option><option value="sal">Sal Mineral</option>
                <option value="adubo">Adubo</option><option value="veneno">Veneno</option>
                <option value="vacina_aftosa">Vacina Aftosa</option><option value="combustivel">Combustível</option>
            </select>
            <input id="swal-qtd" type="number" class="swal2-input" placeholder="Quantidade" style="width:85%;">
        `,
        background: '#2a2a2a', color: '#fff', focusConfirm: false, showCancelButton: true, confirmButtonColor: '#9c27b0', confirmButtonText: 'Injetar',
        preConfirm: () => { return { item: document.getElementById('swal-item').value, qtd: document.getElementById('swal-qtd').value } }
    });

    if (formValues && formValues.qtd) {
        godAction('/api/admin/injetar_insumo', { jogador_id: id, item: formValues.item, quantidade: formValues.qtd });
    }
};

window.avancarTempoJogador = function(jogadorId, nomeJogador) {
    Swal.fire({
        title: 'Avançar Tempo',
        text: `Quantas horas você quer avançar na fazenda de ${nomeJogador}?`,
        input: 'number',
        inputAttributes: { min: 1, step: 1 },
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-forward"></i> Avançar',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff',
        confirmButtonColor: '#00acc1'
    }).then((result) => {
        if (result.isConfirmed) {
            let horas = parseInt(result.value);
            if (!horas || horas <= 0) return Swal.showValidationMessage('Digite um valor válido.');

            godAction('/api/admin/avancar_tempo_jogador', { jogador_id: jogadorId, horas: horas });
        }
    });
};
