import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import RoboAdvisorChat from '@/components/portfolio/RoboAdvisorChat';
import UserDropdown from '@/components/UserDropdown';
import { searchStocks } from '@/lib/actions/finnhub.actions';

const Header = async ({ user }: { user: User }) => {
    const initialStocks = await searchStocks();

    return (
        <header className="sticky top-0 header border-b border-white/6 bg-[#0b0f19]/85 backdrop-blur-md">
            <div className="container header-wrapper gap-4">
                <Link href="/">
                    <Image src="/assets/icons/roboadvisor-logo.svg" alt="RoboAdvisor logo" width={180} height={48} className="h-10 w-auto cursor-pointer" />
                </Link>
                <Navbar initialStocks={initialStocks} />

                <div className="ml-auto flex items-center gap-3">
                    <RoboAdvisorChat />
                    <UserDropdown user={user} initialStocks={initialStocks} />
                </div>
            </div>
        </header>
    )
}
export default Header
