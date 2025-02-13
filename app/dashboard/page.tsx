// app/dashboard/page.tsx
'use client';


import {useRouter, useSearchParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import {CrossIcon} from "@/components/icons";
import MenuButtonGroup from "@/components/dashboard/menu-button-group";
import PaymentsComponent from "@/components/dashboard/payments";
import SettingsComponent from "@/components/dashboard/settings";
import OverflowComponent from "@/components/dashboard/overflow";

export default function DashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'settings';

    return (
        <div className="min-h-screen bg-background relative">
            {/* Кнопка возврата на предыдущую страницу чата */}
            <Button
                variant={'ghost'}
                size={'icon'}
                className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 rounded-full"
                onClick={() => router.back()}
            >
                <CrossIcon/>
            </Button>

            <div className="p-4">
                {/* Переключатель табов */}
                <MenuButtonGroup/>

                {/* Отображение компонента в зависимости от выбранного таба */}
                <div className="mt-6">
                    {tab === 'payments' && <PaymentsComponent/>}
                    {tab === 'settings' && <SettingsComponent/>}
                    {tab === 'overflow' && <OverflowComponent/>}
                </div>
            </div>
        </div>
    );
}
