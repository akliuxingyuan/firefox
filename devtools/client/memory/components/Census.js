/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  Component,
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");
const Tree = createFactory(
  require("resource://devtools/client/shared/components/VirtualizedTree.js")
);
const CensusTreeItem = createFactory(
  require("resource://devtools/client/memory/components/CensusTreeItem.js")
);
const {
  TREE_ROW_HEIGHT,
} = require("resource://devtools/client/memory/constants.js");
const {
  censusModel,
  diffingModel,
} = require("resource://devtools/client/memory/models.js");

class Census extends Component {
  static get propTypes() {
    return {
      census: censusModel,
      onExpand: PropTypes.func.isRequired,
      onCollapse: PropTypes.func.isRequired,
      onFocus: PropTypes.func.isRequired,
      onViewSourceInDebugger: PropTypes.func.isRequired,
      onViewIndividuals: PropTypes.func.isRequired,
      diffing: diffingModel,
    };
  }

  render() {
    const {
      census,
      onExpand,
      onCollapse,
      onFocus,
      diffing,
      onViewSourceInDebugger,
      onViewIndividuals,
    } = this.props;

    const report = census.report;
    const parentMap = census.parentMap;
    const { totalBytes, totalCount } = report;

    const getPercentBytes =
      totalBytes === 0 ? _ => 0 : bytes => (bytes / totalBytes) * 100;

    const getPercentCount =
      totalCount === 0 ? _ => 0 : count => (count / totalCount) * 100;

    return Tree({
      autoExpandDepth: 0,
      preventNavigationOnArrowRight: false,
      focused: census.focused,
      getParent: node => {
        const parent = parentMap[node.id];
        return parent === report ? null : parent;
      },
      getChildren: node => node.children || [],
      isExpanded: node => census.expanded.has(node.id),
      onExpand,
      onCollapse,
      onFocus,
      renderItem: (item, depth, focused, arrow, expanded) =>
        new CensusTreeItem({
          onViewSourceInDebugger,
          item,
          depth,
          focused,
          arrow,
          expanded,
          getPercentBytes,
          getPercentCount,
          diffing,
          inverted: census.display.inverted,
          onViewIndividuals,
        }),
      getRoots: () => report.children || [],
      getKey: node => node.id,
      itemHeight: TREE_ROW_HEIGHT,
    });
  }
}

module.exports = Census;
