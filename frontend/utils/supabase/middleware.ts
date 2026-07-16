import {createServerClient} from "@supabase/ssr";
import {NextResponse, type NextRequest} from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({name, value, options}) =>
                    request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({name, value, options}) =>
                    supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: {user},
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    if (
        !user &&
        (path.startsWith("/dashboard") ||
        path.startsWith("/onboarding") ||
        path.startsWith("/ai-parser") ||
        path.startsWith("/checklist"))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (user && path.startsWith("/login")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    if (
        user &&
        !path.startsWith("/onboarding") &&
        (path.startsWith("/dashboard") ||
        path.startsWith("/ai-parser") ||
        path.startsWith("/checklist"))
    ) {
        const {data: profile} = await supabase
            .from("profiles")
            .select("batch_id")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.batch_id) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}