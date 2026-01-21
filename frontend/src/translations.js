export const translations = {
    en: {
        // Header
        driverPanel: "Driver Panel",
        logout: "Logout",
        idle: "Idle",
        trip: "Trip",

        // Tabs
        activeTrip: "Active Trip",
        tripHistory: "Trip History",

        // Active Trip
        startNewTrip: "Start New Trip",
        starting: "Starting...",
        processing: "Processing...",
        tripCompleted: "Trip Completed!",

        // States
        // States (mapped to DB values)
        "Exit Factory": "Exit Factory",
        "Arrival at Warehouse": "Arrival at Warehouse",
        "Exit Warehouse": "Exit Warehouse",
        "Arrival at Factory": "Arrival at Factory",

        // Actions
        logExitFactory: "Log Exit Factory",
        logArriveWarehouse: "Log Arrive Warehouse",
        logExitWarehouse: "Log Exit Warehouse",
        logArriveFactoryEnd: "Log Arrive Factory (End Trip)",
        goToAnotherWarehouse: "Go to Another Warehouse",
        returnToFactory: "Return to Factory",
        warehouseExitQuestion: "You have exited the warehouse.",
        whereGoingNext: "Where are you going next?",

        // Timeline
        tripTimeline: "Trip Timeline",
        steps: "Steps",
        next: "Next",

        // Months
        january: "January",
        february: "February",
        march: "March",
        april: "April",
        may: "May",
        june: "June",
        july: "July",
        august: "August",
        september: "September",
        october: "October",
        november: "November",
        december: "December",

        // Trip History
        loadingTrips: "Loading trips...",
        noTripsFound: "No trips found",
        noTripsMessage: "You haven't completed any trips in",
        viewDetails: "View Details",
        hideDetails: "Hide Details",
        timeline: "Timeline",
        warehouses: "Warehouses",
        warehouse: "Warehouse",
        duration: "Duration",
        completed: "Completed",

        // Errors & Warnings
        locationDenied: "Location permission denied. Please enable GPS.",
        locationUnavailable: "Location unavailable. Check GPS signal.",
        failedToLogState: "Failed to log state. Ensure GPS is enabled.",
        locationWarning: "⚠️ Location permission is required. Please check your browser settings.",
        failedToStartTrip: "Failed to start trip. Please try again.",

        // Misc
        pinnedLocation: "Pinned Location",
        loadingTripState: "Loading Trip State...",
    },
    ar: {
        // Header
        driverPanel: "لوحة السائق",
        logout: "تسجيل الخروج",
        idle: "خامل",
        trip: "رحلة",

        // Tabs
        activeTrip: "الرحلة النشطة",
        tripHistory: "سجل الرحلات",

        // Active Trip
        startNewTrip: "بدء رحلة جديدة",
        starting: "جاري البدء...",
        processing: "جاري المعالجة...",
        tripCompleted: "اكتملت الرحلة!",

        // States
        exitFactory: "الخروج من المصنع",
        arriveWarehouse: "الوصول إلى المستودع",
        exitWarehouse: "الخروج من المستودع",
        arriveFactory: "الوصول إلى المصنع",
        // Direct DB mappings
        "Exit Factory": "الخروج من المصنع",
        "Arrival at Warehouse": "الوصول إلى المستودع",
        "Exit Warehouse": "الخروج من المستودع",
        "Arrival at Factory": "الوصول إلى المصنع",

        // Actions
        logExitFactory: "تسجيل الخروج من المصنع",
        logArriveWarehouse: "تسجيل الوصول للمستودع",
        logExitWarehouse: "تسجيل الخروج من المستودع",
        logArriveFactoryEnd: "تسجيل الوصول للمصنع (إنهاء الرحلة)",
        goToAnotherWarehouse: "الذهاب إلى مستودع آخر",
        returnToFactory: "العودة إلى المصنع",
        warehouseExitQuestion: "لقد خرجت من المستودع.",
        whereGoingNext: "إلى أين تتجه الآن؟",

        // Timeline
        tripTimeline: "الجدول الزمني للرحلة",
        steps: "خطوات",
        next: "التالي",

        // Months
        january: "يناير",
        february: "فبراير",
        march: "مارس",
        april: "أبريل",
        may: "مايو",
        june: "يونيو",
        july: "يوليو",
        august: "أغسطس",
        september: "سبتمبر",
        october: "أكتوبر",
        november: "نوفمبر",
        december: "ديسمبر",

        // Trip History
        loadingTrips: "جاري تحميل الرحلات...",
        noTripsFound: "لا توجد رحلات",
        noTripsMessage: "لم تكمل أي رحلات في",
        viewDetails: "عرض التفاصيل",
        hideDetails: "إخفاء التفاصيل",
        timeline: "الجدول الزمني",
        warehouses: "مستودعات",
        warehouse: "مستودع",
        duration: "المدة",
        completed: "مكتملة",

        // Errors & Warnings
        locationDenied: "تم رفض إذن الموقع. يرجى تفعيل GPS.",
        locationUnavailable: "الموقع غير متاح. تحقق من إشارة GPS.",
        failedToLogState: "فشل تسجيل الحالة. تأكد من تفعيل GPS.",
        locationWarning: "⚠️ إذن الموقع مطلوب. يرجى التحقق من إعدادات المتصفح.",
        failedToStartTrip: "فشل بدء الرحلة. يرجى المحاولة مرة أخرى.",

        // Misc
        pinnedLocation: "موقع محدد",
        loadingTripState: "جاري تحميل حالة الرحلة...",
    }
};
