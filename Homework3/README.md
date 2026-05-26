# Homework 3: Visualization Dashboard: Interactivity

For Homework 3, you will extend your Homework 2 dashboard to include interactions and animated transitions. You may start fresh, i.e., select different datasets from HW2 or design different visualizations. Still, you will use JavaScript/TypeScript with D3.js.

To begin, you need to first fork this repository.
After the fork, clone the repository using the following commands:

```bash
  git clone https://github.com/<your-github-account-name>/ecs163-26s
  cd ecs163-26s/Homework3
```

Create a new folder inside the Homework 3 directory in the forked repository. The name of the folder should be the same as your UC Davis email account name (without ' @ucdavis.edu'). **Inside this folder, you will add all your code.**

We provided a template using JavaScript, you can find it and more technical details in `./Homework3/Template`. **DO NOT** directly modify the template.

To start the application, open the folder which contains all your files in **VSCode**, then open *index.html*, right click and press "Open with Live Server".

---

## Requirements

In the previous homework, you designed and implemented a dashboard with three visualization views. **The goal of this homework is to learn how to incorporate interaction techniques to drill-down data as well as make use of animation techniques to explore and understand a dataset.**

* One of your views must represent an **overview** of the dataset.
* As with the previous homework, one of your views must be an **advanced visualization**.
* Implement **two** of the following interaction techniques into your dashboard:
  * **Selection**: select one or multiple data points
  * **Brushing**: selection of a subset of the displayed data by dragging or using a bounding shape
  * **Pan and Zoom**: rescale the plot to focus on a part of the visualization
* Incorporate **one or more** of the animated transitions listed in the assignment using animation.

As with the previous homework, you will continue to use the **focus + context** design paradigm.

## Submission

```bash
git add <your-filename>
git commit -m "Homework3"
git push
```

After you push your code to your repository, follow the instructions [here](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork) to create a pull request for this repository. Finally, submit the hyperlink of the pull request to UCD Canvas. The hyperlink should look like this — "https://github.com/via-teaching/ecs163-26s/pull/{your-pull-request-id}".
