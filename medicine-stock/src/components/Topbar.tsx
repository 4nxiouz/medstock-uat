import Header from './Header'

type TopbarProps = {
    onLogout: () => void
}

function Topbar({ onLogout }: TopbarProps) {
    return (
        <Header
            title="Dashboard"
            subtitle="Medical supply inventory overview"
            onLogout={onLogout}
        />
    )
}

export default Topbar
