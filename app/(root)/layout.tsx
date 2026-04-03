import MainLayout from "@/components/MainLayout";
import {auth} from "@/lib/better-auth/auth";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {headers} from "next/headers";
import {redirect} from "next/navigation";

const Layout = async ({ children }: { children : React.ReactNode }) => {
    const session = await auth.api.getSession({ headers: await headers() });

    if(!session?.user) redirect('/sign-in');

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    }

    const initialStocks = await searchStocks();

    return (
        <MainLayout user={user} initialStocks={initialStocks}>{children}</MainLayout>
    )
}
export default Layout
