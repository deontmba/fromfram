const deliveredOrders = [
  {
    id: "cmq53r6sm001604jmenf4iyv4",
    deliveryDate: "2026-06-19T10:30:00.000Z",
    status: "DELIVERED",
    mealType: "DINNER",
    weeklyBox: {
      mealSelections: [
        { dayOfWeek: "SENIN", mealType: "LUNCH", recipe: { name: "Salmon Bowl Sehat" } },
        { dayOfWeek: "SENIN", mealType: "DINNER", recipe: { name: "Oatmeal Pisang Greek Yogurt" } },
        { dayOfWeek: "SELASA", mealType: "LUNCH", recipe: { name: "Sup Ayam Jahe" } },
        { dayOfWeek: "SELASA", mealType: "DINNER", recipe: { name: "Salmon Bowl Sehat" } },
        { dayOfWeek: "JUMAT", mealType: "LUNCH", recipe: { name: "Salmon Bowl Sehat" } },
        { dayOfWeek: "JUMAT", mealType: "DINNER", recipe: { name: "Sup Ayam Jahe" } },
      ]
    }
  }
];

const getDayNameFromDate = (dateString) => {
  const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  const date = new Date(dateString);
  return days[date.getDay()];
};

deliveredOrders.forEach((order) => {
  const selections = order.weeklyBox?.mealSelections || [];
  const orderDay = order.deliveryDate ? getDayNameFromDate(order.deliveryDate) : "";
  const orderMealType = typeof order.mealType === "string" ? order.mealType.toUpperCase() : "";

  console.log(`orderDay: "${orderDay}", orderMealType: "${orderMealType}"`);

  const filteredSelections = selections.filter((sel) => {
    const selDay = typeof sel.dayOfWeek === "string" ? sel.dayOfWeek.toUpperCase() : "";
    const selMeal = typeof sel.mealType === "string" ? sel.mealType.toUpperCase() : "";
    return selDay === orderDay && (!orderMealType || selMeal === orderMealType);
  });

  console.log("Filtered selections:");
  console.log(filteredSelections);
});
