window.prepararVenda = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} kg em estoque.`,
        input: 'number',
        inputAttributes: {
            min: 1,
            max: qtdMax,
            step: 1
        },
        inputValue: qtdMax, // Já sugere vender tudo
        showCancelButton: true,
        confirmButtonText: 'Vender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2e7d32',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            
            Swal.fire({ title: 'Carregando caminhão...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/silo/vender', {
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
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};

window.expandirSilo = function() {
    Swal.fire({
        title: 'Expandir Silo?',
        text: 'Isso custará R$ 5000,00 e adicionará +500 kg de capacidade.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, expandir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/silo/expandir', {
                method: 'POST'
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};
