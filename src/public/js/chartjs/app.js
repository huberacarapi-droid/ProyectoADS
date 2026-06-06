Chart.defaultColor = '#fff';
const printCharts = () => {
    renderModelsChart();
}

const renderModelsChart = () => {

    const data = {
        labels: votaciones[2].votosPorCandidato.candidatos,
        datasets: [{
            data: votaciones[2].votosPorCandidato.votos,
            borderColor: getDataColors(),
            backgroundColor: getDataColors(60)
        }]
    }

    const options = {
        plugins: {
            legend: { position: 'left', display: true },
            tooltip: { enabled: true },
            datalabels: {
                formatter: (value, context) => {
                    //console.log(votaciones[2].votosPorCandidato.porcentaje[context.dataIndex])
                    const display = [`Votos:${value}`, `${votaciones[2].votosPorCandidato.porcentaje[context.dataIndex]} %`]
                    return display
                }
            }
        }

    }
    new Chart('chart_votacion_3', { type: 'doughnut', data, options, plugins: [ChartDataLabels] })
}
printCharts();