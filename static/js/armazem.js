window.prepararVendaInsumo = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} un em estoque.`,
        input: 'number',
        inputAttributes: { min: 1, max: qtdMax, step: 1 },
        inputValue: qtdMax,
        showCancelButton: true,
        confirmButtonText: 'Vender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d32f2f',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            Swal.fire({ title: 'Despachando...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Vendido!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Erro', d.erro, 'error');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha no servidor.', 'error'));
        }
    });
};

window.expandirArmazem = function() {
    Swal.fire({
        title: 'Expandir Armazém?',
        text: 'Isso custará R$ 4000,00 e adicionará +300 un de capacidade.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, expandir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/expandir', { method: 'POST' })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha no servidor.', 'error'));
        }
    });
};
