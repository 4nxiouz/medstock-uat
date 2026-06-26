import Header from './Header'

type TopbarProps = {
    onLogout: () => void
}

function Topbar({ onLogout }: TopbarProps) {
    return (
        <Header
            title="Dashboard"
            subtitle="Pharmacy inventory overview"
            onLogout={onLogout}
        />
    )
}

export default Topbar
