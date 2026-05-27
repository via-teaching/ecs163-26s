# Pokemon Type and Battle Stat Dashboard

In this homework, I used the Pokemon dataset. The goal of my dashboard was to find out some useful information about Pokemon types and battle stats. I mainly focused on primary type, secondary type, and generation.

First of all, I made a bar chart. This chart shows how many Pokemon are in each primary type. As we can see, some types have many more Pokemon than other types. I used this chart as the overview because it gives users a clear idea about the whole dataset.

Second, I made a chord diagram. This is the advanced visualization in my dashboard. It shows the relationship between `Type_1` and `Type_2`. If a Pokemon only has one type, it is shown as a same-type connection. This chart is useful because many Pokemon have two types, and the relationship between these types is not easy to see from a normal table.

Third, I made a line chart. This chart compares the average battle stats across generations. I used HP, Attack, Defense, Sp_Atk, Sp_Def, and Speed. This chart helps users see whether Pokemon stats changed in different generations.

The three views are connected by the same dataset. The bar chart gives an overview, the chord diagram shows type relationships, and the line chart shows changes in battle stats. I used different colors for different Pokemon types and also added legends, titles, and axis labels to make the dashboard easier to read.

AI Disclosure: I utilized ChatGPT to assist in understanding D3.js syntax, brainstorming dashboard layouts, and learning the implementation logic for the bar chart, line chart, and chord diagram. Following this learning phase, I independently developed the code for my Pokémon dataset. However, when the final script failed to execute correctly, I consulted ChatGPT to help debug the errors. I have reviewed all modifications, and I fully understand the final code submitted.
