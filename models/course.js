'use strict';
const Sequelize = require('sequelize');

const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
		Course.belongsTo(models.User, {
			as: 'user',
			foreignKey: {
				fieldName: 'userId',
				allowNull: 'false'
			},
		});
	}
  };
  Course.init({
    id: {type: Sequelize.INTEGER, primaryKey: true, autoGenerated: true},
    title: {type: Sequelize.STRING, allowNull: false},
    description: {type: Sequelize.TEXT, allowNull: false},
    estimatedTime: {type: Sequelize.STRING, allowNull: true},
    materialsNeeded: {type: Sequelize.STRING, allowNull:true}
  }, {
    sequelize,
    modelName: 'Course',
  });
  return Course;
};